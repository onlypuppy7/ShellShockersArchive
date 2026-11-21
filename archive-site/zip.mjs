// ZIP "stored" entries, UTF-8 filenames, CRC-32. No libraries or server required.
const encoder = new TextEncoder();
const table = Uint32Array.from({length:256}, (_, value) => {
  for(let k=0;k<8;k++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes) {
  let crc=0xffffffff;
  for(const byte of bytes) crc = table[(crc ^ byte)&255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export function safePath(path) {
  if(typeof path!=='string'||!path||/[\\\x00-\x1f:]/.test(path)||path.startsWith('/')||path.split('/').some(p=>!p||p==='.'||p==='..')) throw new Error('Invalid archive path.');
  return path;
}
function header(size) {const bytes=new Uint8Array(size);return [bytes,new DataView(bytes.buffer)];}
export class ZipWriter {
  constructor(write, timestamp='20000101000000') {
    this.write=write;this.offset=0;this.entries=[];this.closed=false;
    const y=Math.max(1980,Math.min(2107,Number(timestamp.slice(0,4))));
    this.date=((y-1980)<<9)|(Number(timestamp.slice(4,6))<<5)|Number(timestamp.slice(6,8));
    this.time=(Number(timestamp.slice(8,10))<<11)|(Number(timestamp.slice(10,12))<<5)|(Number(timestamp.slice(12,14))>>1);
  }
  async emit(bytes) {if(this.offset+bytes.length>0xffffffff) throw new Error('This export exceeds the 4 GiB ZIP limit.');await this.write(bytes);this.offset+=bytes.length;}
  async add(name, body) {
    if(this.closed) throw new Error('ZIP is already complete.');
    safePath(name);if(this.entries.length>=65535) throw new Error('Too many files for this ZIP.');
    const bytes=body instanceof Uint8Array?body:new Uint8Array(body);
    const filename=encoder.encode(name);if(filename.length>65535||bytes.length>0xffffffff) throw new Error('File is too large for this ZIP.');
    const crc=crc32(bytes), offset=this.offset;
    const [local,v]=header(30);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(10,this.time,true);v.setUint16(12,this.date,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,filename.length,true);
    await this.emit(local);await this.emit(filename);await this.emit(bytes);
    this.entries.push({filename,crc,size:bytes.length,offset});
  }
  async finish() {
    if(this.closed) throw new Error('ZIP is already complete.');
    const start=this.offset;
    for(const f of this.entries) {
      const [central,v]=header(46);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(12,this.time,true);v.setUint16(14,this.date,true);v.setUint32(16,f.crc,true);v.setUint32(20,f.size,true);v.setUint32(24,f.size,true);v.setUint16(28,f.filename.length,true);v.setUint32(42,f.offset,true);
      await this.emit(central);await this.emit(f.filename);
    }
    const length=this.offset-start;const [end,v]=header(22);v.setUint32(0,0x06054b50,true);v.setUint16(8,this.entries.length,true);v.setUint16(10,this.entries.length,true);v.setUint32(12,length,true);v.setUint32(16,start,true);await this.emit(end);this.closed=true;
  }
}
