export function randomBytes(size: number, callback: (err: Error | null, buf?: Buffer) => void) {
  if (size < 30) {
    const buf = Buffer.from('mock buffer');
    callback(null, buf);
    return;
  }

  callback(Error('mock error'));
}
