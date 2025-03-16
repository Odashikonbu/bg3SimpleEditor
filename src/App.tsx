import { useAtom, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

import { DataGrid, GridColDef, GridRowClassNameParams, GridToolbar } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from "@mui/material";

import { useEffectOnce } from "react-use";

import { applyMasterDictionary, openXMLFile } from "./AppModules";
import { loadingFileAtom, messageAtom, translation, translationAtom, unSavedTranslationAtom } from "./Atoms";
import clsx from "clsx";

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const App = () => {
  const [rows, setRows] = useAtom(translationAtom);
  const setLoadingFile = useSetAtom(loadingFileAtom);
  const setMessage = useSetAtom(messageAtom);
  const [_, setUnSavedTranslation] = useAtom(unSavedTranslationAtom);
  
  const columns: GridColDef[] = [
    { field: 'index', headerName: 'Index', width: 0 },
    { field: 'contentuid', headerName: 'UUID', flex: 0.25, sortable: true, filterable: true },
    { field: 'originText', headerName: 'Original Text', flex: 0.75, sortable: true, filterable: true },
    { field: 'translatedText', headerName: 'Translated Text', flex: 1, sortable: true, editable: true, resizable: false, filterable: true },
  ];

  useEffectOnce(() => {
    const unlisten = listen("tauri://drag-drop", async (event) => {
      const paths = (event.payload as { paths: string[] }).paths;
      const result = await openXMLFile(rows, paths[0]);
      const autTrans = localStorage.getItem("autoTranslation");
      
      if (result.messageType == 1) {
        setLoadingFile(paths[0]);
        setRows(result.translations);
        setMessage({type: 1, text: result.message})
        if(autTrans == "true"){
          const apply = await applyMasterDictionary(result.translations);
          setRows(apply.translations);
          setMessage({type: apply.messageType, text: apply.message});
        }
      }else if(result.messageType == 2){
        setMessage({type: 2, text: result.message})
      }
      setUnSavedTranslation(false);
    });
    
    return () => {
      unlisten.then(f => f());
    }
  });

  const onUpdateRows = (nl: any, ol: any) => {
    const newRow = nl as translation
    const oldRow = ol as translation
    console.log(newRow.index)
    if(newRow.translatedText != oldRow.translatedText){
      const newRows = [...rows]
      newRows[newRow.index].translatedText = newRow.translatedText
      setRows(newRows)
      setUnSavedTranslation(true);
    }
    return nl;
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div style={{ height: '100%', width: '100%' }}>
        <DataGrid
          columnVisibilityModel={{ index: false }}
          rows={rows}
          columns={columns}
          getRowId={(row) => row.index}
          processRowUpdate={onUpdateRows}
          disableColumnMenu
          disableColumnFilter
          disableColumnSelector
          disableDensitySelector
          getRowClassName={(e: GridRowClassNameParams<translation>) => { 
            return clsx({ "bg-green-700 text-white": e.row.originText != e.row.translatedText })
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              printOptions: { disableToolbarButton: true },
              csvOptions: { disableToolbarButton: true },
            },
          }}
          onProcessRowUpdateError={ () => {} }
          localeText={{ noRowsLabel: 'Drag&Drop .xml File' }}
          paginationMode="client"
          rowSelection={false}
        />
      </div>
    </ThemeProvider>
  );
};

export default App;
