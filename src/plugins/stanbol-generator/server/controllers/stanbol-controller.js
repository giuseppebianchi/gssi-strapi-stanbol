'use strict';

module.exports = ({ strapi }) => ({
  async generate(ctx) {
    ctx.body = await strapi
      .plugin('stanbol-generator')
      .service('stanbol')
      .enhanceText(ctx.request.body.prompt);
    console.log(ctx.body)
  }
});
