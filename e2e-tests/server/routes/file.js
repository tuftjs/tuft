const file = () => {
  return { file: './e2e-tests/server/assets/abc.txt' };
};

const fileWithStatus = () => {
  return {
    status: 418,
    file: './e2e-tests/server/assets/abc.txt',
  };
};

module.exports = {
  file,
  fileWithStatus,
};
