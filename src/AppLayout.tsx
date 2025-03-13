/// <reference types="vite/client" />
import { useAtom } from "jotai";
import { ReactNode, useRef } from "react";
import useSound from "use-sound";
import clsx from "clsx";
import { open, save } from "@tauri-apps/plugin-dialog";
import { loadingFileAtom, messageAtom, translationAtom } from "./Atoms";
import { openXMLFile, writeXMLFile } from "./AppModules";

import NotificationSound from "./assets/notification.wav";
import { useEffectOnce } from "react-use";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [translation] = useAtom(translationAtom);
  const [rows, setRows] = useAtom(translationAtom);
  const [loadingFile, setLoadingFile] = useAtom(loadingFileAtom);
  const [message, setMessage] = useAtom(messageAtom);
  const [play] = useSound(NotificationSound);

  const overWriteButton = useRef<HTMLButtonElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const readyHotkey = useRef<boolean>(false);

  const openFIle = async () => {
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
      }
    }
  };

  const overwriteFile = async () => {
    console.log(`loading file: ${loadingFile}`);
    if (loadingFile != undefined) {
      console.log(`overwrite: ${loadingFile}`);
      const result = await writeXMLFile(rows, loadingFile);
      setMessage(result);
      play();
    } else {
      console.log("no file loaded");
    }
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

  const initHotkey = () => {
    if(readyHotkey.current) return

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      if (
        event.key == "s" &&
        event.ctrlKey &&
        event.altKey &&
        !saveButton.current?.disabled
      ) {
        event.preventDefault();
        saveButton.current?.click();
      } else if (
        event.key == "s" &&
        event.ctrlKey &&
        !overWriteButton.current?.disabled
      ) {
        event.preventDefault();
        overWriteButton.current?.click();
      } else if (event.key == "o" && event.ctrlKey) {
        event.preventDefault();
        openButton.current?.click();
      }
    });

    readyHotkey.current = true
  };

  useEffectOnce(() => {
    initHotkey();
  });

  return (
    <>
      <header className="navbar px-5">
        <h1 className="navbar-start text-2xl">BG3 Simple XML Editor</h1>
        <div className="navbar-end gap-x-10">
          <button
            type="button"
            className="btn"
            ref={openButton}
            onClick={openFIle}
          >
            <span>Open .xml File<br/><span className="text-xs">[Ctrl+O]</span></span>
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="navbar px-5">
        <span
          className={clsx(
            "navbar-start",
            { "text-success": message.type == 1 },
            { "text-error": message.type == 2 }
          )}
        >
          {message.text}
        </span>
        <div className="navbar-end gap-x-10">
          <div className="flex flex-col">
            <button
              type="button"
              className="btn"
              disabled={translation.length == 0}
              ref={overWriteButton}
              onClick={overwriteFile}
            >
              <span>Save Overwrite<br/><span className="text-xs">[Ctrl+S]</span></span>
            </button>
          </div>
          <button
            type="button"
            className="btn"
            disabled={translation.length == 0}
            ref={saveButton}
            onClick={selectSavePath}
          >
            <span>Save as New File<br/><span className="text-xs">[Ctrl+Alt+S]</span></span>
          </button>
        </div>
      </footer>
    </>
  );
};

export default AppLayout;
