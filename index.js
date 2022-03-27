// @ts-nocheck
// ==UserScript==
// @name         open in mpv
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  点击 bgm.tv 动漫页面的集数，便可通过 MPV 播放本地储存的那集动漫
// @connect      ip
// @author       kaho
// @match        https://bgm.tv/subject/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
  // 封装油猴的请求函数
  const ajax = option =>
    new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...option,
        onerror: reject,
        onload: resolve,
      });
    });

  // 定义下所需参数
  const animeList = [];
  const episodeList = document.querySelector('.prg_list');
  const host = 'https://<host>/'; // 可以 nginx 开一个文件目录，host 指定 nginx 设的 location

  // 重新定义每集 a 标签的动作
  (function setMethod() {
    for (const item of episodeList.children) {
      item.children[0].href = 'javascript:void(0)';
      item.children[0].addEventListener('click', playToMpv);
    }
  })();

  /**
   * 获取本地存储中所有的动漫名称，如过和 bgm 上的中文名称对不上就得手动改一下了
   * 还没想到好的办法解决
   * */
  (function getAnimeList() {
    ajax({ method: 'GET', url: host }).then(res => {
      const DOM = new DOMParser().parseFromString(res.responseText, 'text/html');

      DOM.querySelectorAll('a').forEach(item => {
        animeList.push(item.textContent.slice(0, -1));
      });
    });
  })();

  // 获取当前页面的动漫名称
  function getCurAnimeName() {
    return document.querySelector('#infobox').children[0].textContent.slice(5);
  }

  // 获取本地存储中动漫文件名
  async function getAnimeFileUrl(url, ep) {
    let fileUrl;

    await ajax({
      method: 'GET',
      url: host + encodeURIComponent(url) + '/' + ep,
    }).then(res => {
      fileUrl = res.responseText;
    });

    try {
      fileUrl = fileUrl.match(/(?<=<a href=")%.*(?=">)/)[0];
    } catch (error) {
      console.log('请求 Url 出错，没找到文件\n', fileUrl);
      console.log(error);
    }

    return fileUrl;
  }

  function openMpv(path) {
    const iframe = document.createElement('iframe');
    iframe.src = `mpv://play/${window.btoa(path)}`;
    document.body.appendChild(iframe);
  }

  // 点击播放
  async function playToMpv(event) {
    const ep = +event.target.textContent; // 获取点击的是哪集
    const epId = +event.target.id.slice(4);
    const curAnimeName = getCurAnimeName();
    let path; // 完整的地址
    let addr = GM_getValue(curAnimeName) ?? curAnimeName;

    if (!animeList.includes(curAnimeName) && !GM_getValue(curAnimeName)) {
      addr = prompt('没找到动漫路径，请手动输入文件夹里的动漫名称', addr);

      GM_setValue(curAnimeName, addr);
      path = `${host}/${encodeURIComponent(addr)}/${ep}/${await getAnimeFileUrl(addr, ep)}`;
    }

    if (!animeList.includes(addr)) {
      alert('检查一下文件夹名称和 bgm 中文动漫名称是否对的上');
      GM_deleteValue(curAnimeName);
      return;
    }

    path = path ?? `${host}/${encodeURIComponent(addr)}/${ep}/${await getAnimeFileUrl(addr, ep)}`;

    // 自定义的 URl Protocol 只能这样打开
    openMpv(path);

    // 标记为 看过
    document.querySelector(`#Watched_${epId}`).click();
  }
})();
