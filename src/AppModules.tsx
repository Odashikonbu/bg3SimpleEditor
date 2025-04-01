import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { basename, join, resourceDir } from '@tauri-apps/api/path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { translation, result, message, dictionary, dictValue } from "./Atoms";
import { parse, stringify,  } from 'yaml'

export const openXMLFile = async(contentList: translation[],path: string):Promise<result> => {
  try {
    const xml = await readTextFile(path);

    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xml);

    if (!result.contentList || !Array.isArray(result.contentList.content)) {
      return { messageType: 2, message: "invalid xml!!!", translations: contentList }
    }

    const newContentList: translation[] = result.contentList.content.map((item: any, index:number) => ({
      index: index,
      contentuid: item['@_contentuid'],
      originText: item['#text'],
      translatedText: item['#text'],
    }));

    return { messageType: 1, message: `loaded xml: ${await basename(path)}`, translations: newContentList };
  } catch (error) {
    return { messageType: 2, message: `Error!!!: ${error}`, translations: contentList };
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
  const dictMap = new Map();

  const masterDictPath = await join(await resourceDir(), "dict.yml")
  try{
    if(await exists(masterDictPath)){
      try{
        const yamlData = parse(await readTextFile(masterDictPath))
        for(const key in yamlData){
          dictMap.set(key, yamlData[key])
        }
      }catch(e){
        return { type: 2, text: "failed load existing dictionary file. please remove or move dict.yaml"}
      }
    }
    contentList.forEach( (item) => {
      if(item.originText != item.translatedText) {
        dictMap.set(item.contentuid, {originText: item.originText, translatedText: item.translatedText,})
      }
    })
  }
  catch(e){
    return { type: 2, text: `error: ${e}`}
  }

  if(dictMap.size == 0){
    return { type: 1, text: `0 translation detected, no file saved` }
  }
  await writeTextFile(masterDictPath, stringify(dictMap, {lineWidth: -1}));

  return { type: 1, text: "translation saved!!!"}
}

export const applyMasterDictionary = async(contentList: translation[]):Promise<result> => {
  const newTranslation = [...contentList];
  const masterDictPath = await join(await resourceDir(), "dict.yml")
  if(await exists(masterDictPath)){
    try{
      const yamlData = parse(await readTextFile(masterDictPath))

      newTranslation.forEach((item) => {
        const pattern = yamlData[item.contentuid]
        console.log(pattern)
        if(pattern != undefined && item.originText == pattern.originText){
          item.translatedText = pattern.translatedText
        }
      })

      return { messageType: 1, message: `translation applied!!`, translations: newTranslation }
    }catch(e){
      console.log(e)
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
      const yamlData = parse(await readTextFile(path))

      newTranslation.forEach((item) => {
        const pattern = yamlData[item.contentuid]
        if(pattern != undefined && item.originText == pattern.originText){
          item.translatedText = pattern.translatedText
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

export const exportDictionary = async(contentList: translation[], path: string):Promise<message> => {
  const dictMap = new Map();
  try{
    contentList.forEach( (item) => {
      if(item.originText != item.translatedText) {
        dictMap.set(item.contentuid, {originText: item.originText, translatedText: item.translatedText,})
      }
    })
  }
  catch(e){
    return { type: 2, text: `error: ${e}`}
  }

  if(dictMap.size == 0){
    return { type: 2, text: "0 translation detected, no file saved"}
  }
  await writeTextFile(path, stringify(dictMap, {lineWidth: -1}));

  return { type: 1, text: "translation exported!!!"}

}

export const loadTranslation = async(contentList: translation[], path: string):Promise<result> => {
  const dictMap = new Map();
  try {
    const xml = await readTextFile(path);
    const newTranslation = [...contentList];

    const parser = new XMLParser({ ignoreAttributes: false });
    const result = parser.parse(xml);

    console.log(result);

    if (!result.contentList || !Array.isArray(result.contentList.content)) {
      return { messageType: 2, message: "invalid xml!!!", translations: contentList }
    }

    const contents:dictionary[] = result.contentList.content.map((item: any) => {
      return {
        contentuid: item['@_contentuid'],
        originText: item['#text'],
        translatedText: item['#text'],
      }})

    console.log(contents)
    contents.forEach((item: dictionary) => {
      dictMap.set(item.contentuid, {originText: item.originText, translatedText: item.translatedText,})
    });
    console.log(dictMap)

    
    newTranslation.forEach((item) => {
      const pattern = dictMap.get(item.contentuid) as dictValue
      if(pattern != undefined){
        item.translatedText = pattern.translatedText
      }
    })

    return { messageType: 1, message: `loaded translation: ${await basename(path)}`, translations: newTranslation };
  } catch (error) {
    return { messageType: 2, message: `Error!!!: ${error}`, translations: contentList };
  }
}