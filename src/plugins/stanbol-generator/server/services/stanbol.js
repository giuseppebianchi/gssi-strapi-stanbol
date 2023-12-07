'use strict';

const axios = require('axios');

module.exports = ({ strapi }) => ({

  async enhanceText(prompt) {
    try {
      const response = await axios(
        {
          url: 'http://localhost:8080/engines',
          params: {
            outputContent: 'application/json'
          },
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          data: prompt
        })

      return response.data;
    }
    catch (err) {
      console.log(err.response)
    }

  }

});
