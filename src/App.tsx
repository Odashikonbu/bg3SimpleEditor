import { useAtom, useSetAtom } from "jotai";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

import { DataGrid, GridColDef, GridRowClassNameParams } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from "@mui/material";

import { useEffectOnce } from "react-use";

import { openXMLFile } from "./AppModules";
import { loadingFileAtom, messageAtom, translation, translationAtom } from "./Atoms";
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
  
  const columns: GridColDef[] = [
    { field: 'index', headerName: 'Index', width: 0 },
    { field: 'contentuid', headerName: 'UUID', flex: 0.25, sortable: true },
    { field: 'originText', headerName: 'Original Text', flex: 0.75, sortable: true },
    { field: 'translatedText', headerName: 'Translated Text', flex: 1, sortable: true, editable: true, resizable: false },
  ];

  useEffectOnce(() => {
    const unlisten = listen("tauri://drag-drop", async (event) => {
      const paths = (event.payload as { paths: string[] }).paths;
      const result = await openXMLFile(paths[0]);
      
      if (result.messageType == 1) {
        setLoadingFile(paths[0])
        setRows(result.translations);
      }else if(result.messageType == 2){
        setMessage({type: 2, text: result.message})
      }
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
          getRowClassName={(e: GridRowClassNameParams<translation>) => { 
            return clsx({ "bg-green-700 text-white": e.row.originText != e.row.translatedText })
          }}
          onProcessRowUpdateError={ () => {} }
          disableColumnMenu
          localeText={{ noRowsLabel: 'Drag&Drop .xml File' }}
          paginationMode="client"
          rowSelection={false}
        />
      </div>
    </ThemeProvider>
  );
};

export default App;
