declare module 'he' {
  export function decode(text: string): string;
  export function encode(text: string): string;
  export default {
    decode,
    encode
  };
} 