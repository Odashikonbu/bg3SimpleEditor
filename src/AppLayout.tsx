/// <reference types="vite/client" />
import { useAtom } from "jotai";
import { ReactNode, useMemo, useRef } from "react";
import useSound from "use-sound";
import clsx from "clsx";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  autoTranslationAtom,
  completeTranslateAtom,
  loadingFileAtom,
  messageAtom,
  searchAtom,
  translationAtom,
  unSavedTranslationAtom,
} from "./Atoms";
import {
  openXMLFile,
  writeXMLFile,
  saveMasterDictionary,
  applyMasterDictionary,
  importDictionary,
  exportDictionary,
  loadTranslation,
} from "./AppModules";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { SearchIcon } from "lucide-react";

import NotificationSound from "./assets/notification.wav";
import { useEffectOnce } from "react-use";
import { basename, dirname, join } from "@tauri-apps/api/path";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [translation] = useAtom(translationAtom);
  const [completeTranslate] = useAtom(completeTranslateAtom);
  const translatedRadio = useMemo(() => completeTranslate / translation.length * 100, [completeTranslate])
  const [rows, setRows] = useAtom(translationAtom);
  const [loadingFile, setLoadingFile] = useAtom(loadingFileAtom);
  const [message, setMessage] = useAtom(messageAtom);
  const [play] = useSound(NotificationSound);
  const [autoTranslation, setAutoTranslation] = useAtom(autoTranslationAtom);
  const [searchText, setSearchText] = useAtom(searchAtom);
  const [unSavedTranslation, setUnSavedTranslation] = useAtom(
    unSavedTranslationAtom
  );

  const finalizeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const loadXMLButton = useRef<HTMLButtonElement>(null);
  const saveDictButton = useRef<HTMLButtonElement>(null);
  const importButton = useRef<HTMLButtonElement>(null);
  const exportButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const readyHotkey = useRef<boolean>(false);

  const openFIle = async () => {
    const autTrans = localStorage.getItem("autoTranslation");
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "XML file", extensions: ["xml", "XML"] }],
    });
    console.log(`open: ${file}`);
    if (file != null) {
      const result = await openXMLFile(rows, file);
      if (result.messageType == 1) {
        setLoadingFile(file);
        setRows(result.translations);
        setMessage({ type: 1, text: result.message });
        setUnSavedTranslation(false);

        if (autTrans == "true") {
          const apply = await applyMasterDictionary(result.translations);
          setRows(apply.translations);
          setMessage({ type: apply.messageType, text: apply.message });
          setUnSavedTranslation(false);
        }
      }
    }
  };

  const loadXML = async () => {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "XML file", extensions: ["xml", "XML"] }],
    });
    console.log(`open: ${file}`);
    if (file != null) {
      const result = await loadTranslation(rows, file);
      console.log(result);
      if (result.messageType == 1) {
        setRows(result.translations);
        setMessage({ type: 1, text: result.message });
        setUnSavedTranslation(false);
      }
    }
  };

  const importDict = async () => {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [
        { name: "YAML file", extensions: ["yaml", "yml", "YAML", "YML"] },
      ],
    });
    console.log(`import: ${file}`);

    if (file != null) {
      const result = await importDictionary(rows, file);
      setRows(result.translations);
      setMessage({ type: result.messageType, text: result.message });
    }
  };

  const exportDict = async () => {
    if (loadingFile != undefined) {
      const date = new Date();
      const yymmdd =
        date.getFullYear() +
        ("00" + (date.getMonth() + 1)).slice(-2) +
        ("00" + date.getDate()).slice(-2);
      const exportDir = await dirname(loadingFile);
      const exportFile =
        (await basename(loadingFile)).replace(/\./g, "_").replace("xml", "") +
        "__exported__" +
        yymmdd +
        ".yml";
      const exportFullPath = await join(exportDir, exportFile);

      const file = await save({
        filters: [
          { name: "YAML file", extensions: ["yaml", "yml", "YAML", "YML"] },
        ],
        defaultPath: exportFullPath,
        canCreateDirectories: true,
      });
      console.log(`export file: ${file}`);

      if (file != null) {
        console.log(`export: ${file}`);
        const result = await exportDictionary(rows, file);
        play();
        setMessage(result);
      }
    } else {
      console.log("no file loaded");
    }
  };

  const saveDict = async () => {
    await setMessage(await saveMasterDictionary(translation));
    setUnSavedTranslation(false);
    play();
  };

  const selectSavePath = async () => {
    console.log(`loading file: ${loadingFile}`);
    if (loadingFile != undefined) {
      const file = await save({
        filters: [{ name: "XML file", extensions: ["xml", "XML"] }],
        defaultPath: loadingFile,
        canCreateDirectories: true,
      });

      if (file != null) {
        console.log(`save: ${file}`);
        setLoadingFile(file);
        const result = await writeXMLFile(rows, file);
        play();
        setMessage(result);
      }
    } else {
      console.log("no file loaded");
    }
  };

  const closeTranslation = async () => {
    if (unSavedTranslation) {
      const answer = await confirm(
        "Unsaved Translations exsits, close translation?"
      );
      if (!answer) {
        return;
      }
    }

    setRows([]);
    setUnSavedTranslation(false);
  };

  const initHotkey = () => {
    if (readyHotkey.current) return;

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (
        event.key == "s" &&
        event.ctrlKey &&
        event.altKey &&
        !finalizeButton.current?.disabled
      ) {
        event.preventDefault();
        finalizeButton.current?.click();
      } else if (
        event.key == "s" &&
        event.ctrlKey &&
        !saveDictButton.current?.disabled
      ) {
        event.preventDefault();
        saveDictButton.current?.click();
      } else if (event.key == "o" && event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        openButton.current?.click();
      } else if (event.key == "w" && event.ctrlKey && !event.shiftKey) {
        event.preventDefault();
        closeButton.current?.click();
      } else if (
        event.key == "i" &&
        event.ctrlKey &&
        event.shiftKey &&
        !saveDictButton.current?.disabled
      ) {
        event.preventDefault();
        importButton.current?.click();
      } else if (
        event.key == "e" &&
        event.ctrlKey &&
        event.shiftKey &&
        !saveDictButton.current?.disabled
      ) {
        event.preventDefault();
        exportButton.current?.click();
      } else if (
        event.key == "l" &&
        event.ctrlKey &&
        event.altKey &&
        !saveDictButton.current?.disabled
      ) {
        event.preventDefault();
        loadXMLButton.current?.click();
      }
    });

    readyHotkey.current = true;
  };

  useEffectOnce(() => {
    initHotkey();
  });

  return (
    <>
      <header className="flex flex-col">
        <div className="flex flex-row">
          <div className="flex flex-row flex-1 place-content-end py-3 gap-x-5 items-end">
            <h1 className="text-2xl max-sm:text-sm transition">BG3 Simple XML Editor</h1>
            <div className="flex-1" />
          </div>
          <div className="flex flex-row items-center gap-x-5">
            <SearchIcon size={18} />
            <Input
              className="w-[220px] h-[29px] text-sm bg-black border-2 border-red-500"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full bg-transparent flex items-center gap-x-5 place-content-end pb-4">
          <div className="flex flex-row place-items-center gap-x-10">
            <Button
              type="button"
              ref={closeButton}
              className="h-[30px]! w-[90px]!"
              variant="destructive"
              onClick={closeTranslation}
            >
              <span>Close</span>
            </Button>
            <div className="flex flex-row max-sm:flex-col items-center gap-x-1">
              <label htmlFor="auto-translate" className="text-sm text-center truncate w-[120px] max-sm:w-[60px]">
                auto translation
              </label>
              <Switch
                id="auto-translate"
                onCheckedChange={() => setAutoTranslation(!autoTranslation)}
                checked={autoTranslation}
              />
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-row max-sm:flex-col gap-x-5 mb-5 max-sm:gap-y-1">
            <Button
              type="button"
              ref={importButton}
              onClick={importDict}
              className="h-[25px]! w-[90px]!"
              disabled={translation.length == 0}
            >
              Import
            </Button>
            <Button
              type="button"
              ref={exportButton}
              onClick={exportDict}
              className="h-[25px]! w-[90px]!"
              disabled={translation.length == 0}
            >
              Export
            </Button>
          </div>
          <Button
            type="button"
            variant="default"
            className="bg-blue-600! hover:bg-blue-800! text-white! w-[170px]! h-[40px]! mb-5"
            ref={openButton}
            onClick={openFIle}
          >
            <span>Open .xml File</span>
          </Button>
        </div>
      </header>
      <main>{children}</main>
      <div className="text-sm"></div>
      <footer className="navbar flex-col">
        <div className="w-full flex flex-row items-end pt-2 gap-x-5 place-content-end">
          <Button
            type="button"
            disabled={translation.length == 0}
            ref={loadXMLButton}
            onClick={loadXML}
          >
            <span>load other .xml File</span>
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            disabled={translation.length == 0}
            className="bg-green-600! hover:bg-green-800! text-white!"
            ref={finalizeButton}
            onClick={selectSavePath}
          >
            <span>Save .xml File</span>
          </Button>
          <Button
            type="button"
            disabled={translation.length == 0}
            className="bg-green-600! hover:bg-green-800! text-white! h-[50px] w-[180px]"
            ref={saveDictButton}
            onClick={saveDict}
          >
            <span>Save Dictionary</span>
          </Button>
        </div>
        <div className="flex flex-row mt-2 w-full pt-1">
          <span
            className={clsx(
              "transition w-full justify-place-end text-nowrap text-sm truncate",
              { "text-green-500": message.type == 1 },
              { "text-red-600": message.type == 2 }
            )}
          >
            {message.text}
          </span>
          <div className="flex-1" />
          <div className="flex flex-row items-center place-content-end gap-x-5 w-full mr-5">
            <span className="truncate">Translated:</span>
            <Progress value={translatedRadio} className="w-[100px] h-[20px] rounded-sm "/>
            <span className="text-sm truncate">{completeTranslate} / {translation.length}</span>
          </div>
        </div>
      </footer>
    </>
  );
};

export default AppLayout;
