// ==UserScript==
// @name         B站收藏夹总时长统计
// @namespace    https://github.com/emberstd/userscripts
// @version      1.0.1
// @description  进入B站任意公开收藏夹页面，一键计算并显示当前收藏夹视频总时长。
// @author       emberstd
// @match        *://space.bilibili.com/*
// @match        *://www.bilibili.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      bilibili.com
// @run-at       document-start
// ==/UserScript==
 
(function() {
    'use strict';
 
    console.log("[B站时长统计] 脚本已启动，正在监听菜单与界面...");
 
    // 封装请求
    function requestJson(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Referer": "https://space.bilibili.com/",
                    "User-Agent": navigator.userAgent
                },
                onload: function(response) {
                    try {
                        const json = JSON.parse(response.responseText);
                        resolve(json);
                    } catch (e) {
                        reject(e);
                    }
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    }
 
    // 页面提示条
    function showToast(text, isEnd = false) {
        let box = document.getElementById("bili-fav-timer-toast");
        if (!box) {
            box = document.createElement("div");
            box.id = "bili-fav-timer-toast";
            box.style.cssText = `
                position: fixed !important;
                top: 90px !important;
                right: 30px !important;
                z-index: 2147483647 !important;
                background-color: #00AEEC !important;
                color: #ffffff !important;
                padding: 14px 22px !important;
                border-radius: 10px !important;
                box-shadow: 0 6px 20px rgba(0,0,0,0.25) !important;
                font-size: 15px !important;
                font-weight: bold !important;
                line-height: 1.6 !important;
                white-space: pre-line !important;
                transition: opacity 0.3s ease !important;
            `;
            (document.body || document.documentElement).appendChild(box);
        }
        box.innerText = text;
        if (isEnd) {
            setTimeout(() => {
                if (box) {
                    box.style.opacity = "0";
                    setTimeout(() => box && box.remove(), 400);
                }
            }, 7000);
        }
    }
 
    // 提取收藏夹 ID
    function getMediaId() {
        const url = window.location.href;
        const m1 = url.match(/[?&]fid=(\d+)/);
        if (m1) return m1[1];
        const m2 = url.match(/\/ml(\d+)/);
        if (m2) return m2[1];
        return null;
    }
 
    // 统计核心
    async function calculateDuration() {
        const fid = getMediaId();
        if (!fid) {
            alert("⚠️ 未检测到收藏夹 ID！\n请先点击进入具体的收藏夹分类页面（网址通常包含 fid=xxxx 或 mlxxxx）");
            return;
        }
 
        let page = 1, totalSec = 0, count = 0, title = "";
        showToast("⏳ 正在读取收藏夹数据，请稍候...");
 
        while (true) {
            try {
                const url = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${fid}&pn=${page}&ps=20&platform=web`;
                const json = await requestJson(url);
 
                if (json.code !== 0 || !json.data || !json.data.medias) break;
 
                title = json.data.info ? json.data.info.title : "当前收藏夹";
                for (const m of json.data.medias) {
                    totalSec += m.duration;
                    count++;
                }
 
                if (!json.data.has_more) break;
                page++;
                await new Promise(r => setTimeout(r, 250));
            } catch (err) {
                console.error("[B站时长统计]", err);
                showToast("❌ 接口请求出错，请刷新重试", true);
                return;
            }
        }
 
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
 
        showToast(`✅ 【${title}】\n共 ${count} 个视频\n总时长：${h} 小时 ${m} 分钟 ${s} 秒`, true);
    }
 
    // 1. 注册油猴原生菜单（最稳入口，不依赖页面任何元素）
    try {
        GM_registerMenuCommand("⏱️ 计算当前收藏夹总时长", calculateDuration);
    } catch(e) {}
 
    // 2. 页面悬浮按钮注入
    function createButton() {
        if (document.getElementById("btn-fav-timer")) return;
 
        const btn = document.createElement("button");
        btn.id = "btn-fav-timer";
        btn.innerText = "⏱️ 统计时长";
        btn.style.cssText = `
            position: fixed !important;
            bottom: 160px !important;
            right: 28px !important;
            z-index: 2147483647 !important;
            padding: 10px 18px !important;
            background: linear-gradient(135deg, #fb7299, #ff527f) !important;
            color: #ffffff !important;
            border: 2px solid #ffffff !important;
            border-radius: 30px !important;
            cursor: pointer !important;
            box-shadow: 0 4px 15px rgba(251, 114, 153, 0.5) !important;
            font-size: 14px !important;
            font-weight: bold !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
 
        btn.onclick = calculateDuration;
        (document.body || document.documentElement).appendChild(btn);
    }
 
    // 监听与挂载
    const checkTimer = setInterval(() => {
        if (document.body || document.documentElement) {
            createButton();
        }
    }, 1000);
 
})();