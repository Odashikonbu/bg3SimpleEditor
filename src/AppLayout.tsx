/// <reference types="vite/client" />
import { useAtom } from "jotai";
import { ReactNode } from "react";
import useSound from 'use-sound';
import clsx from "clsx";
import { open, save } from '@tauri-apps/plugin-dialog';
import { loadingFileAtom, messageAtom, translationAtom } from "./Atoms"
import { openXMLFile, writeXMLFile } from "./AppModules";

import NotificationSound from './assets/notification.wav';

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [translation] = useAtom(translationAtom);
  const [rows, setRows] = useAtom(translationAtom);
  const [loadingFile, setLoadingFile] = useAtom(loadingFileAtom);
  const [message, setMessage] = useAtom(messageAtom);
  const [play] = useSound(NotificationSound);

  const openFIle = async() => {
    const file = await open({
      multiple: false,
      directory: false,
      filters: [ {name: 'XML file', extensions: ['xml', 'XML']} ]
    });
    if(file != null){
      const result = await openXMLFile(file);
      if (result.messageType == 1) {
        setLoadingFile(file);
        setRows(result.translations);
      }
    }
  }

  const overwriteFile = async() => {
    if(loadingFile){
      const result = await writeXMLFile(rows, loadingFile)
      setMessage(result);
      play();
    }
  } 

  const selectSavePath = async() => {
    if(loadingFile){
      const file = await save({
        filters: [ {name: 'XML file', extensions: ['xml', 'XML']} ],
        defaultPath: loadingFile,
        canCreateDirectories: true,
      })

      if(file != null){
        const result = await writeXMLFile(rows, file);
        play();
        setMessage(result);
      }
    }
  }

  return (
    <>
      <header className="navbar px-5">
        <h1 className="navbar-start text-2xl">BG3 Translator</h1>
        <div className="navbar-end gap-x-10">
          <button
            type="button"
            className="btn"
            onClick={openFIle}
          >
            <span>Open .xml File</span>
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="navbar px-5">
        <span className={clsx("navbar-start", { "text-success" : message.type == 1 }, { "text-error" : message.type == 2 })}>{ message.text }</span>
        <div className="navbar-end gap-x-10">
          <div className="flex flex-col">
            
            <button
              type="button"
              className="btn"
              disabled={translation.length == 0}
              onClick={overwriteFile}
            >
              <span>Save Overwrite</span>
            </button>
          </div>
          <button
            type="button"
            className="btn"
            disabled={translation.length == 0}
            onClick={selectSavePath}
          >
            <span>Save as New File</span>
          </button>
        </div>
      </footer>
    </>
  );
};

export default AppLayout;
