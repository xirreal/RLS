import { tokens } from '../config.js';
import { hrtime } from 'process';

import axios from 'axios';

let lastRequest = 0;
const userCache = {};

const getUser = async (id) => {
  if (userCache[id]) return userCache[id];

  while (hrtime.bigint() - BigInt(500000000) < lastRequest) { // Has been less than 500ms since last request
    await new Promise((res) => setTimeout(res, 100));
  }

  lastRequest = hrtime.bigint();

  return userCache[id] = (await axios.get(`https://discord.com/api/v9/users/${id}`, {
    headers: {
      'Authorization': `Bot ${tokens.discord}`
    }
  })).data;
}

export default async (id) => {
  const user = await getUser(id);

  return { // Use semi-minified keys as to avoid size
    i: id, // id

    n: user.username, // name

    a: user.avatar // avatar
  }
};