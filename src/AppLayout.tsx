/// <reference types="vite/client" />
import { useAtom } from "jotai";
import { ReactNode, useRef } from "react";
import useSound from "use-sound";
import clsx from "clsx";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import {
  autoTranslationAtom,
  loadingFileAtom,
  messageAtom,
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
} from "./AppModules";

import NotificationSound from "./assets/notification.wav";
import { useEffectOnce } from "react-use";
import { basename, dirname, join } from "@tauri-apps/api/path";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [translation] = useAtom(translationAtom);
  const [rows, setRows] = useAtom(translationAtom);
  const [loadingFile, setLoadingFile] = useAtom(loadingFileAtom);
  const [message, setMessage] = useAtom(messageAtom);
  const [play] = useSound(NotificationSound);
  const [autoTranslation, setAutoTranslation] = useAtom(autoTranslationAtom);
  const [unSavedTranslation, setUnSavedTranslation] = useAtom(
    unSavedTranslationAtom
  );

  const finalizeButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
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
      const result = await openXMLFile(file);
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
      const yymmdd = date.getFullYear() + ('00' + (date.getMonth() + 1)).slice(-2) + ('00' + date.getDate()).slice(-2); 
      const exportDir = await dirname(loadingFile);
      const exportFile = (await basename(loadingFile)).replace(/\./g, "_").replace("xml", "") + "__exported__" + yymmdd + ".yml";
      const exportFullPath = await join(exportDir, exportFile)


      const file = await save({
        filters: [{ name: "YAML file", extensions: ["yaml", "yml", "YAML", "YML"] }],
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
      } else if (event.key == "i" && event.ctrlKey && event.shiftKey && !saveDictButton.current?.disabled) {
        event.preventDefault();
        importButton.current?.click();
      } else if (event.key == "e" && event.ctrlKey && event.shiftKey && !saveDictButton.current?.disabled) {
        event.preventDefault();
        exportButton.current?.click();
      }
    });

    readyHotkey.current = true;
  };

  useEffectOnce(() => {
    initHotkey();
  });

  return (
    <>
      <header className="navbar px-5">
        <div className="navbar-start items-start flex-col h-full gap-y-2">
          <h1 className="text-md transition">BG3 Simple XML Editor</h1>
          <div className="flex flex-row place-items-end gap-x-10">
            <button
              type="button"
              ref={closeButton}
              className="btn !btn-error h-[30px]! w-[90px]!"
              onClick={closeTranslation}
            >
              <span>Close</span>
            </button>
            <div className="flex flex-col items-end gap-y-1">
              <span className="text-sm">auto translation</span>
              <input
                type="checkbox"
                className="toggle mx-auto"
                checked={autoTranslation}
                onChange={() => setAutoTranslation(!autoTranslation)}
              />
            </div>
          </div>
        </div>
        <div className="navbar-end gap-x-5 items-end">
          <button
            type="button"
            ref={importButton}
            className="btn btn-secondary! bg-gray-300 text-black! h-[30px]! w-[100px]! text-sm"
            onClick={importDict}
            disabled={translation.length == 0}
          >
            Import
          </button>
          <button
            type="button"
            ref={exportButton}
            className="btn btn-secondary! bg-gray-300 text-black! h-[30px]! w-[100px]! text-sm"
            onClick={exportDict}
            disabled={translation.length == 0}
          >
            Export
          </button>
          <button
            type="button"
            className="btn"
            ref={openButton}
            onClick={openFIle}
          >
            <span>Open .xml File</span>
          </button>
        </div>
      </header>
      <main>{children}</main>
      <div className="text-sm"></div>
      <footer className="navbar px-5 flex-col">
        <div className="size-full flex flex-row items-end gap-x-5 place-content-end">
          <button
            type="button"
            className="btn btn-error!"
            disabled={translation.length == 0}
            ref={finalizeButton}
            onClick={selectSavePath}
          >
            <span>Save .xml File</span>
          </button>
          <button
            type="button"
            className="btn h-[65px]!"
            disabled={translation.length == 0}
            ref={saveDictButton}
            onClick={saveDict}
          >
            <span>Save Dictionary</span>
          </button>
        </div>
        <div className="flex flex-col content-start w-full">
          <span
            className={clsx(
              "transition w-full justify-place-end text-nowrap text-md",
              { "text-success": message.type == 1 },
              { "text-error": message.type == 2 }
            )}
          >
            {message.text}
          </span>
        </div>
      </footer>
    </>
  );
};

export default AppLayout;
