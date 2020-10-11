const text = () => {
  return { text: 'Hello, world!' };
};

const textWithStatus = () => {
  return {
    status: 418,
    text: 'Hello, world!',
  };
};

module.exports = {
  text,
  textWithStatus,
};
