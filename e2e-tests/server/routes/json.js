const json = () => {
  return {
    json: { hello: 'world' },
  };
};

const jsonWithStatus = () => {
  return {
    status: 418,
    json: { hello: 'world' },
  };
};

module.exports = {
  json,
  jsonWithStatus,
};
