import { useAtom, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import "./AppLayout.css";

import { useEffectOnce } from "react-use";

import { AgGridReact } from "ag-grid-react";
import {
  type GridOptions,
  type ColDef,
  themeMaterial,
  colorSchemeDark,
  CellValueChangedEvent,
} from "ag-grid-community";

import { applyMasterDictionary, openXMLFile } from "./AppModules";
import {
  loadingFileAtom,
  messageAtom,
  searchAtom,
  translation,
  translationAtom,
  unSavedTranslationAtom,
} from "./Atoms";

const App = () => {
  const [rows, setRows] = useAtom(translationAtom);
  const setLoadingFile = useSetAtom(loadingFileAtom);
  const setMessage = useSetAtom(messageAtom);
  const [_, setUnSavedTranslation] = useAtom(unSavedTranslationAtom);
  const [searchText] = useAtom(searchAtom);

  const gridOptions: GridOptions<translation> = {
    stopEditingWhenCellsLoseFocus: true,
    suppressMoveWhenColumnDragging: true,
    getRowStyle: params => {
      if (params.data?.originText != params.data?.translatedText) {
          return { background: 'green' };
      }
    },
    theme: themeMaterial
      .withParams({
        wrapperBorder: true,
        headerRowBorder: true,
        borderRadius: 0.5,
        textColor: "white",
        rowBorder: { style: "solid", width: 1, color: "#ffffff" },
        columnBorder: { style: "dashed", color: "#ffffff" },
      })
      .withPart(colorSchemeDark),
  };
  const defaultColumnDef: ColDef = {
    suppressMovable: true,
    headerStyle: {
      backgroundColor: "#121111",
      fontWeight: "bold",
      color: "white",
    },
  };

  const columns: ColDef<translation>[] = [
    {
      field: "contentuid",
      headerName: "UUID",
      width: 120,
      headerStyle: { borderRight: "solid 0.01px #474747" },
    },
    {
      field: "originText",
      headerName: "Original Text",
      headerStyle: { borderRight: "solid 0.01px #474747" },
    },
    {
      field: "translatedText",
      headerName: "Translated Text",
      resizable: false,
      flex: 1,
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellEditorParams: {
        outerHeight: 40,
        innerHeight: 40
      },
    },
  ];

  useEffectOnce(() => {
    const unlisten = listen("tauri://drag-drop", async (event) => {
      const paths = (event.payload as { paths: string[] }).paths;
      const result = await openXMLFile(rows, paths[0]);
      const autTrans = localStorage.getItem("autoTranslation");

      if (result.messageType == 1) {
        setLoadingFile(paths[0]);
        setRows(result.translations);
        setMessage({ type: 1, text: result.message });
        if (autTrans == "true") {
          const apply = await applyMasterDictionary(result.translations);
          setRows(apply.translations);
          setMessage({ type: apply.messageType, text: apply.message });
        }
      } else if (result.messageType == 2) {
        setMessage({ type: 2, text: result.message });
      }
      setUnSavedTranslation(false);
    });

    return () => {
      unlisten.then((f) => f());
    };
  });

  const onUpdateRows = (event: CellValueChangedEvent<translation>) => {
    if (event.oldValue != event.newValue) {
      const newRows = [...rows];
      newRows[event.rowIndex as number].translatedText = event.newValue;
      setRows(newRows);
      setUnSavedTranslation(true);
    }
  };

  return (
    <div className="size-full p-2">
      <AgGridReact
        rowHeight={40}
        gridOptions={gridOptions}
        defaultColDef={defaultColumnDef}
        columnDefs={columns}
        rowData={rows}
        quickFilterText={searchText}
        onCellValueChanged={(e) => onUpdateRows(e)}
      />
    </div>
  );
};

export default App;
