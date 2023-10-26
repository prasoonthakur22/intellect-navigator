import { PGChunk, PGEssay, PGJSON } from "@/types";
import fs from "fs";
import { encode } from "gpt-3-encoder";
import puppeteer from 'puppeteer';


const BASE_URL = "https://www.navigator.nl";
const CHUNK_SIZE = 200;

interface Link {
  url: string | null;
  title: string | null;
}

const getLinks = async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(BASE_URL);

    // Wait for the specific ul element under the openscience section to appear
    await page.waitForSelector('.openscience .tesla-link-container-w-visited li a', { timeout: 5000 });

    const linkData = await page.evaluate(() => {
      // Adjusted the selector to target the ul element under the openscience section
      const linksNodeList = document.querySelectorAll('.openscience .tesla-link-container-w-visited li a');
      console.log("Number of links:", linksNodeList.length);
      return Array.from(linksNodeList).map(link => ({
        url: link.getAttribute('href'),
        title: link.textContent,
      }));
    });

    await browser.close();

    // Prepend BASE_URL to the URL of each link
    const fullLinksArr = linkData.map((link: Link) => ({
      url: `${BASE_URL}${link.url}`,
      title: link.title,
    }));

    return fullLinksArr;

  } catch (error) {
    console.error('Error fetching data: ', error);
    return [];
  }
};



const getEssay = async (linkObj: { url: string; title: string }) => {
  console.log("Inside getEssay function");

  const { title, url } = linkObj;

  const essay = {
    title: "",
    url: "",
    date: "",
    content: "",
    length: 0,
    tokens: 0,
    chunks: []
  };

  const fullLink = url;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Expose the encode function to the page
  await page.exposeFunction('encode', encode);

  console.log(`Navigating to URL: ${fullLink}`);
  let pagedata = await page.goto(fullLink);

  console.log('pagedata : ', pagedata);

  try {
    await page.waitForSelector('#AcceptB-All', { timeout: 3000 });
    await page.click('#AcceptB-All');
    console.log('Clicked the Accept all cookies button.');
  } catch (error) {
    console.log('Accept all cookies button did not appear.');
  }

  await page.waitForSelector('.document-head  h1.hP', { timeout: 25000 });
  await page.waitForSelector('#documentContent .showHideMetaLink  span', { timeout: 5000 });
  await page.waitForSelector('.hP.wknl_onlineinfo', { timeout: 5000 });

  console.log('Done waiting for elements. Starting evaluation.');

  const pageData = await page.evaluate(async () => {
    const essay = {
      title: "",
      date: "",
      content: "",
      length: 0,
      tokens: 0,
      chunks: []
    };

    const titleElement = document.querySelector('.document-head  h1.hP');
    const dateElement = document.querySelector('#documentContent .showHideMetaLink  span');
    const contentElement = document.querySelector('.hP.wknl_onlineinfo');

    let title = '';
    if (titleElement) {
      essay.title = (titleElement as HTMLElement).innerText;
    }

    let date = '';
    if (dateElement) {
      const dateMatch = (dateElement as HTMLElement).innerText;
      if (dateMatch) {
        essay.date = dateMatch;
      }
    }

    let content = '';
    if (contentElement) {
      content = (contentElement as HTMLElement).innerText;
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\.([a-zA-Z])/g, '. $1')
        .replace(/\n/g, ' ')
        .trim();
      essay.content = content;
    }

    essay.length = content.length;
    // essay.tokens = encode(content).length;
    essay.tokens = (await window.encode(essay.content)).length;

    return {
      essay
    };
  });
  await browser.close();

  return {
    url: fullLink,
    ...pageData,
  };
};


const chunkEssay = async (essay: PGEssay) => {
  console.log("essay log : ", essay);

  // const { title, url, date, content, ...chunklessSection } = essay;

  const { url, essay: { title, date, content } } = essay;



  let essayTextChunks = [];
  console.log("url: ", url);


  console.log("content: ", content);

  console.log("encode(content).length: ", encode(content).length);

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];

      console.log("encode(sentence): ", encode(sentence));
      console.log("encode(chunkText).length: ", encode(chunkText).length);

      const sentenceTokenLength = encode(sentence);
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength.length > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }

    essayTextChunks.push(chunkText.trim());
  } else {
    essayTextChunks.push(content.trim());
  }

  const essayChunks = essayTextChunks.map((text) => {
    const trimmedText = text.trim();

    const chunk: PGChunk = {
      essay_title: title,
      essay_url: url,
      essay_date: date,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
      embedding: []
    };

    return chunk;
  });

  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        essayChunks.splice(i, 1);
        i--;
      }
    }
  }

  const chunkedSection: PGEssay = {
    ...essay,
    chunks: essayChunks
  };

  return chunkedSection;
};

(async () => {
  const links = await getLinks();

  let essays = [];

  for (let i = 0; i < links.length; i++) {
    const essay = await getEssay(links[i]);
    const chunkedEssay = await chunkEssay(essay);
    essays.push(chunkedEssay);
  }

  const json: PGJSON = {
    current_date: "2023-03-01",
    author: "Developer",
    url: "https://www.navigator.nl",
    length: essays.reduce((acc, essay) => acc + essay.length, 0),
    tokens: essays.reduce((acc, essay) => acc + essay.tokens, 0),
    essays
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));
})();
