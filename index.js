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
// @grant        GM_download
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
  const animeAddrList = [];
  const episodeList = document.querySelector('.prg_list');
  const host = 'https://192.168.0.106/bangumi/';

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
  (function getAnimeAddrList() {
    ajax({ method: 'GET', url: host }).then(res => {
      const DOM = new DOMParser().parseFromString(res.responseText, 'text/html');

      DOM.querySelectorAll('a').forEach(item => {
        animeAddrList.push(item.textContent.slice(0, -1));
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

    return fileUrl.match(/(?<=<a href=")%.*(?=">)/)[0];
  }

  // 点击播放
  async function playToMpv(event) {
    const ep = +event.target.textContent; // 获取点击的是哪集
    const curAnimeName = getCurAnimeName();
    let path; // 完整的地址

    if (!animeAddrList.includes(curAnimeName)) {
      let addr = '';
      prompt('没找到动漫地址，请手动输入文件夹里的动漫名称', addr);

      if (animeAddrList.includes(addr)) alert('检查一下文件夹名称和 bgm 中文动漫名称是否对的上');

      path = `${host}/${encodeURIComponent(curAnimeName)}/${ep}/${await getAnimeFileUrl(curAnimeName, ep)}`;
    }

    path = path ?? `${host}/${encodeURIComponent(curAnimeName)}/${ep}/${await getAnimeFileUrl(curAnimeName, ep)}`;

    // 自定义的 URl Protocol 只能这样打开
    const iframe = document.createElement('iframe');
    iframe.src = `mpv://play/${window.btoa(path)}`;
    document.body.appendChild(iframe);
  }
})();
