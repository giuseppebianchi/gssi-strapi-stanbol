module.exports = [
  {
    method: 'POST',
    path: '/enhance-text',
    handler: 'stanbolController.generate',
    config: {
      auth: false,
      policies: [],
    },
  },
];
