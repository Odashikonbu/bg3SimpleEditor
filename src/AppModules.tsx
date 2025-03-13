import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { translation, result, message } from "./Atoms";

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

    return { messageType: 1, message: "Success!!", translations: contentList };
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