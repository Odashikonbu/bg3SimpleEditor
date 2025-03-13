import { atom } from 'jotai'

export type translation = {
  index: number;
  contentuid: string;
  originText: string;
  translatedText: string;
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