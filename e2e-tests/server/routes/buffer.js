const buffer = () => {
  return { raw: Buffer.from('Hello, world!') };
};

const bufferWithStatus = () => {
  return {
    status: 418,
    raw: Buffer.from('Hello, world!'),
  };
};

module.exports = {
  buffer,
  bufferWithStatus,
};
