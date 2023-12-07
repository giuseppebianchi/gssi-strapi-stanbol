'use strict';

module.exports = ({ strapi }) => {
  strapi.customFields.register({
    name: 'stanbol',
    plugin: 'stanbol-generator',
    type: 'string'
  });
};
