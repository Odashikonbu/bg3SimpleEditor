import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { basename, join, resourceDir } from '@tauri-apps/api/path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { translation, result, message, dictionary } from "./Atoms";
import { parse, stringify,  } from 'yaml'

export const openXMLFile = async(path: string):Promise<result> => {
  try {
    const xml = await readTextFile(path);

    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xml);

    if (!result.contentList || !Array.isArray(result.contentList.content)) {
      return { messageType: 2, message: "invalid xml!!!", translations: [] }
    }

    const contentList: translation[] = result.contentList.content.map((item: any, index:number) => ({
      index: index,
      contentuid: item['@_contentuid'],
      originText: item['#text'],
      translatedText: item['#text'],
    }));

    return { messageType: 1, message: `loaded xml: ${await basename(path)}`, translations: contentList };
  } catch (error) {
    return { messageType: 2, message: `Error!!!: ${error}`, translations: [] };
  }
}

export const writeXMLFile = async(contentList: translation[], filePath: string): Promise<message> => {
  try{
    const builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
    });
  
    const xmlObject = {
      '?xml': {
        '@_version': '1.0',
        '@_encoding': 'UTF-8'
      },
      contentList: {
        content: contentList.map((item) => ({
          '@_contentuid': item.contentuid,
          '@_version': '1',
          '#text': item.translatedText,
        })),
      },
    };
  
    const xml = builder.build(xmlObject);
    await writeTextFile(filePath, xml);
    return { type: 1, text: "Success!!" };
  }catch(e){
    return { type: 2, text: `エラー：${e}` };
  }
}

export const saveMasterDictionary = async(contentList: translation[] ): Promise<message> => {
  const dictData = contentList.map((content) => {
    return {
      contentuid: content.contentuid,
      originText: content.originText,
      translatedText: content.translatedText,
    }
  })

  const dict:dictionary[] = []
  const masterDictPath = await join(await resourceDir(), "dict.yml")
  try{
  
    if(await exists(masterDictPath)){
      try{
        const yamlData = parse(await readTextFile(masterDictPath)) as translation[]
        yamlData.forEach( (item) => dict.push(item))
      }catch(e){
        return { type: 2, text: "failed load existing dictionary file. please remove or move dict.yaml"}
      }
    }

    dictData.forEach( (item) => {
      if(item.originText != item.translatedText) {
        const foundIndex = dict.findIndex(
          (dct) => dct.contentuid === item.contentuid && dct.originText === item.originText
        );
    
        if (foundIndex !== -1) {
          dict[foundIndex] = item;
        } else {
          dict.push(item);
        }
      }
    })
  }
  catch(e){
    return { type: 2, text: `error: ${e}`}
  }

  await writeTextFile(masterDictPath, stringify(dict, {lineWidth: -1}));

  return { type: 1, text: "translation saved!!!"}
}

export const applyMasterDictionary = async(contentList: translation[]):Promise<result> => {
  const newTranslation = [...contentList];
  const masterDictPath = await join(await resourceDir(), "dict.yml")
  if(await exists(masterDictPath)){
    try{
      const yamlData = parse(await readTextFile(masterDictPath)) as translation[]

      yamlData.forEach( (item) => {
        if(item.originText != item.translatedText) {
          const foundIndex = newTranslation.findIndex(
            (dct) => dct.contentuid === item.contentuid && dct.originText === item.originText
          );
      
          if (foundIndex !== -1) {
            newTranslation[foundIndex].translatedText = item.translatedText;
          }
        }
      })

      return { messageType: 1, message: `translation applied!!`, translations: newTranslation }
    }catch(e){
      return { messageType: 2, message: `failed load existing dictionary file. please remove or move dict.yaml`, translations: [...contentList] }
    }
  }else{
    return { messageType: 1, message: `no dict.yaml found. loaded xml file without translate`, translations: [...contentList] }
  }
}

export const importDictionary = async(contentList: translation[], path: string):Promise<result> => {
  const newTranslation = [...contentList];
  if(await exists(path)){
    try{
      const yamlData = parse(await readTextFile(path)) as translation[]

      yamlData.forEach( (item) => {
        if(item.originText != item.translatedText) {
          const foundIndex = newTranslation.findIndex(
            (dct) => dct.contentuid === item.contentuid && dct.originText === item.originText
          );
      
          if (foundIndex !== -1) {
            newTranslation[foundIndex].translatedText = item.translatedText;
          }
        }
      })

      return { messageType: 1, message: `translation imported!!`, translations: newTranslation }
    }catch(e){
      return { messageType: 2, message: `failed import dictionary file. please check dictionary yaml file`, translations: [...contentList] }
    }
  }else{
    return { messageType: 1, message: `no yaml found.`, translations: [...contentList] }
  }
}

export const exportDictionary = async(contentList: translation[], path: string) => {
  const dictData = contentList.map((content) => {
    return {
      contentuid: content.contentuid,
      originText: content.originText,
      translatedText: content.translatedText,
    }
  })

  const dict:dictionary[] = []
  try{
    dictData.forEach( (item) => {
      if(item.originText != item.translatedText) {
        dict.push(item);
      }
    })
  }
  catch(e){
    return { type: 2, text: `error: ${e}`}
  }

  if(dict.length == 0){
    return { type: 2, text: "0 translation detected, no file saved"}
  }
  await writeTextFile(path, stringify(dict, {lineWidth: -1}));

  return { type: 1, text: "translation exported!!!"}

}