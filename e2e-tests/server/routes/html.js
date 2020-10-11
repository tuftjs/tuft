const html = () => {
  return { html: '<h1>Hello, world!</h1>' };
};

const htmlWithStatus = () => {
  return {
    status: 418,
    html: '<h1>Hello, world!</h1>',
  };
};

module.exports = {
  html,
  htmlWithStatus,
};
