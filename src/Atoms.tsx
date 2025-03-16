import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export interface dictionary {
  contentuid: string;
  originText: string;
  translatedText: string;
}

export interface translation extends dictionary{
  index: number;
}

export type result = {
  messageType: number;
  message: string;
  translations: translation[]
}

export type message = {
  type: number;
  text: string;
}

export const translationAtom = atom<translation[]>([])
export const loadingFileAtom = atom<undefined|string>()
export const messageAtom = atom<message>({type: 0, text: ""})
export const autoTranslationAtom = atomWithStorage<boolean>("autoTranslation", true)
export const unSavedTranslationAtom = atom<boolean>(false);