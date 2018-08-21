/**
 * 什么是HUD?
 * HUD最早用于飞机驾驶，平视显示器将一些重要的信息投射到飞机驾驶舱前方的一块玻璃上，飞行员能够将外界的影像和这些重要的信息融合在一起，而不用频繁低头观察仪表盘。
 * 本实例将在网页上显示一个三维物体
 */

import { Matrix4 } from '../../utils/gl-matrix';

const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_MvpMatrix;
    uniform bool u_Clicked;
    varying vec4 v_Color;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        if( u_Clicked ){
            v_Color = vec4(1.0,0.0,0.0,1.0);
        }else {
            v_Color = a_Color;
        }
    }
`;

const FSHADER_SOURCE = `
    precision mediump float;
    varying vec4 v_Color;
    void main(){
        gl_FragColor=v_Color;
    }
`;

let g_mvpMatrix = new Matrix4();
let last = Date.now();
var ANGLE_STEP = 20.0; // Rotation angle (degrees/second)

function main() {
    const canvas = document.getElementById('webgl');
    canvas.style.position = 'absolute';
    canvas.style.zIndex = 0;
    createWebPages();
    // const hud = createDOMs();

    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('获取webgl对象报错');
        return;
    }

    // const ctx = hud.getContext('2d');

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, VSHADER_SOURCE);
    gl.shaderSource(fragmentShader, FSHADER_SOURCE);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.program = program;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.useProgram(program);

    const n = createVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to init vertex buffer');
        return false;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    //获取webgl程序 uniform 变量的 location
    const u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    const u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
    if (!u_MvpMatrix || !u_Clicked) {
        console.log('Failed to get the location');
        return;
    }

    const viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.clientHeight, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    //设置clicked为false
    gl.uniform1i(u_Clicked, 0);

    let currentAngle = 0.0;

    canvas.onmousedown = function (evt) {
        let x = evt.clientX;
        let y = evt.clientY;
        const rect = canvas.getBoundingClientRect();
        if (rect.left <= x && rect.right > x && rect.top <= y && rect.bottom > y) {
            const xInCanvas = x - rect.left;
            const yInCanvas = rect.bottom - y;
            const picked = check(gl, n, xInCanvas, yInCanvas, currentAngle, u_Clicked, viewProjMatrix, u_MvpMatrix);
            if (picked) {
                alert('The cube was selected!');
            }
        }
    }

    const tick = function () {
        currentAngle = animate(currentAngle);
        draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
        // draw2D(ctx, currentAngle);
        requestAnimationFrame(tick, canvas);
    }
    tick();
}

function createVertexBuffers(gl) {
    const vertices = new Float32Array([
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,    // v0-v1-v2-v3 front
        1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,    // v0-v3-v4-v5 right
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,    // v1-v6-v7-v2 left
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,    // v7-v4-v3-v2 down
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0     // v4-v7-v6-v5 back
    ]);
    const colors = new Float32Array([
        0.2, 0.58, 0.82, 0.2, 0.58, 0.82, 0.2, 0.58, 0.82, 0.2, 0.58, 0.82, // v0-v1-v2-v3 front
        0.5, 0.41, 0.69, 0.5, 0.41, 0.69, 0.5, 0.41, 0.69, 0.5, 0.41, 0.69,  // v0-v3-v4-v5 right
        0.0, 0.32, 0.61, 0.0, 0.32, 0.61, 0.0, 0.32, 0.61, 0.0, 0.32, 0.61,  // v0-v5-v6-v1 up
        0.78, 0.69, 0.84, 0.78, 0.69, 0.84, 0.78, 0.69, 0.84, 0.78, 0.69, 0.84, // v1-v6-v7-v2 left
        0.32, 0.18, 0.56, 0.32, 0.18, 0.56, 0.32, 0.18, 0.56, 0.32, 0.18, 0.56, // v7-v4-v3-v2 down
        0.73, 0.82, 0.93, 0.73, 0.82, 0.93, 0.73, 0.82, 0.93, 0.73, 0.82, 0.93, // v4-v7-v6-v5 back    
    ]);
    const indices = new Uint8Array([
        0, 1, 2, 0, 2, 3, //front
        4, 5, 6, 4, 6, 7, //right
        8, 9, 10, 8, 10, 11, //up,
        12, 13, 14, 12, 14, 15,//left
        16, 17, 18, 16, 18, 19,//down
        20, 21, 22, 20, 22, 23//back
    ]);

    const vertexArrayBufferCreated = createArrayBuffer(gl, vertices, gl.FLOAT, 3, 'a_Position');
    const colorArrayBufferCreated = createArrayBuffer(gl, colors, gl.FLOAT, 3, 'a_Color');
    if (!vertexArrayBufferCreated || !colorArrayBufferCreated) {
        console.log('Failed to create the ' + attribute + ' buffer ');
        return -1;
    }

    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the index buffer');
        return -1;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}
/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} data 
 * @param {*} type 
 * @param {*} num 
 * @param {*} attribute 
 */
function createArrayBuffer(gl, data, type, num, attribute) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create buffer with attribute :' + attribute);
        return false;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    const a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the location of attribute :' + attribute);
        return false;
    }
    //将缓冲区对象分配给attribute变量
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    //开启attribute变量
    gl.enableVertexAttribArray(a_attribute);
    return true;
}
/**
 * 判断是否点中cube
 * @param {WebGLRenderingContext} gl 
 * @param {*} n 
 * @param {*} xInCanvas 
 * @param {*} yInCanvas 
 * @param {*} currentAngle 
 * @param {*} u_Clicked 
 * @param {*} viewProjMatrix 
 * @param {*} u_MvpMatrix 
 */
function check(gl, n, xInCanvas, yInCanvas, currentAngle, u_Clicked, viewProjMatrix, u_MvpMatrix) {
    let picked = false;
    gl.uniform1i(u_Clicked, 1);
    //draw the cube with red
    draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
    const pixels = new Uint8Array(4);
    gl.readPixels(xInCanvas, yInCanvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    //red
    if (pixels[0] == 255) {
        picked = true;
    }
    gl.uniform1i(u_Clicked, 0);
    draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);

    return picked;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} n 
 * @param {*} viewProjMatrix 
 * @param {*} u_MvpMatrix 
 * @param {*} currentAngle 
 */
function draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle) {
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.rotate(currentAngle, 1.0, 0.0, 0.0);
    g_mvpMatrix.rotate(currentAngle, 0.0, 1.0, 0.0);
    g_mvpMatrix.rotate(currentAngle, 0.0, 0.0, 1.0);

    gl.uniformMatrix4fv(u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

/**
 * 
 * @param { CanvasRenderingContext2D } ctx 
 * @param {*} currentAngle 
 */
function draw2D(ctx, currentAngle) {
    ctx.clearRect(0, 0, 400, 400);
    ctx.beginPath();
    ctx.moveTo(120, 10);
    ctx.lineTo(200, 150);
    ctx.lineTo(40, 150);

    ctx.closePath();

    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.stroke();

    ctx.font = '18px "Times New Roman"';
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillText('HUD: head Up Display', 40, 180);
    ctx.fillText('Triangle is drawn by Canvas 2D api', 40, 200);
    ctx.fillText('Cube is drawn by WebGL api', 40, 220);
    ctx.fillText('Current Angle: ' + Math.floor(currentAngle), 40, 240);
}

function animate(angle) {
    const now = Date.now();
    const elapsed = now - last;
    last = now;
    const newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}

function createWebPages() {
    const html = `
    <article data-v-13f76525="" itemscope="itemscope" itemtype="http://schema.org/Article" class="article" data-v-3f216172=""><meta itemprop="url" content="https://juejin.im/post/5b7919345188254312414b9c"><meta itemprop="headline" content="通过HTTP的HEADER完成各种骚操作"><meta itemprop="keywords" content="Node.js,HTTP,JavaScript"><meta itemprop="datePublished" content="2018-08-19T10:04:33.150Z"><meta itemprop="image" content="https://b-gold-cdn.xitu.io/icon/icon-128.png"><div itemprop="author" itemscope="itemscope" itemtype="http://schema.org/Person"><meta itemprop="name" content="cherryvenus"><meta itemprop="url" content="https://juejin.im/user/5aa23691518825556d0db27e"></div><div itemprop="publisher" itemscope="itemscope" itemtype="http://schema.org/Organization"><meta itemprop="name" content="掘金"><div itemprop="logo" itemscope="itemscope" itemtype="https://schema.org/ImageObject"><meta itemprop="url" content="https://b-gold-cdn.xitu.io/icon/icon-white-180.png"><meta itemprop="width" content="180"><meta itemprop="height" content="180"></div></div><div data-v-13f76525="" class="author-info-block"><a data-v-13f76525="" href="/user/5aa23691518825556d0db27e" target="_blank" rel="" class="avatar-link"><div data-v-b2db8566="" data-v-1b9df826="" data-v-13f76525="" data-src="https://user-gold-cdn.xitu.io/2018/3/9/16209a728c0a1c1d?imageView2/1/w/100/h/100/q/85/format/webp/interlace/1" class="lazy avatar avatar loaded" title="" style="background-image: url(&quot;https://user-gold-cdn.xitu.io/2018/3/9/16209a728c0a1c1d?imageView2/1/w/100/h/100/q/85/format/webp/interlace/1&quot;);"></div></a><div data-v-13f76525="" class="author-info-box"><a data-v-13f76525="" href="/user/5aa23691518825556d0db27e" target="_blank" rel="" class="username ellipsis">cherryvenus</a><div data-v-13f76525="" class="meta-box"><time data-v-13f76525="" datetime="2018-08-19T10:04:33.150Z" title="Sun Aug 19 2018 18:04:33 GMT+0800 (China Standard Time)" class="time">2018年08月19日</time><span data-v-13f76525="" class="views-count">阅读 593</span><!----></div></div></div><!----><h1 data-v-13f76525="" class="article-title">通过HTTP的HEADER完成各种骚操作</h1><div data-v-13f76525="" data-id="5b7940b151882542d416b0d2" itemprop="articleBody" class="article-content"><p>作为一名专业的切图工程师，我从来不care网页的header，最多关心<code>Status Code</code>是不是<code>200</code>。但是HEADER真的很重要啊，客户端从服务器端获取内容，首先就是通过HEADER进行各种沟通！HEADER可以帮助我们完成许多骚操作，提高网站的性能，用户的体验。好了让我们来feel一下。</p>
    <h2 class="heading" data-id="heading-0">初级骚操作</h2>
    <ul>
    <li>多语言（<code>Accept-Language</code>）</li>
    <li>防盗链（<code>Referer</code>、<code>Referered</code>）</li>
    <li>gzip，简单地说就是省流量（<code>Accept-Encoding</code>，<code>Content-Encoding</code>）</li>
    </ul>
    <h3 class="heading" data-id="heading-1">多语言</h3>
    <p>多语言就是一个网站可以实现多种语言的切换，这里不讨论建N个网站，一个网站也个语言。这里讨论如何智能返回用户所需的语言。</p>
    <table>
    <thead>
    <tr>
    <th style="text-align:left">server</th>
    <th style="text-align:left">client</th>
    </tr>
    </thead>
    <tbody>
    <tr>
    <td style="text-align:left"></td>
    <td style="text-align:left">向server扔过去了<code>Accept-Language</code></td>
    </tr>
    <tr>
    <td style="text-align:left">接收对方的<code>Accept-Language</code></td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">字段大概这样子<code>zh,en-US;q=0.9,en;q=0.8</code></td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">开始处理，将字段变成带权重<code>q</code>的数组</td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">排序好大概长这样<code>[{"name":"zh","q":1},{"name":"en-US","q":0.9},{"name":"en","q":0.8}]</code></td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">根据权重返回拥有的语言，有<code>zh</code>返回<code>zh</code>，没有<code>zh</code>就返回<code>en-US</code></td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">万一我没有对方需要的语言包，怎么办？急，在线等！</td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">没办法了，只能给对方我们的官方（默认）语言</td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">发送，请接收</td>
    <td style="text-align:left"></td>
    </tr>
    <tr>
    <td style="text-align:left">您的ACCEPT语言已匹配</td>
    <td style="text-align:left">这个网站挺上道的，虽然是国外网站，但知道我是中文</td>
    </tr>
    <tr>
    <td style="text-align:left">我们没有你所在地区的语言包</td>
    <td style="text-align:left">emmmm，这是火星文吗？</td>
    </tr>
    </tbody>
    </table>
    <p>附赠多语言的简易实现版：</p>
    <pre><code class="hljs bash copyable" lang="bash"><span class="hljs-built_in">let</span> languages = {
        zh:{
            title:<span class="hljs-string">"你好"</span>,
            content:<span class="hljs-string">"同学"</span>
        },
        en:{
            title:<span class="hljs-string">"Hey"</span>,
            content:<span class="hljs-string">"guy"</span>
        },
    }
    `;
    const ele = document.createElement('div');
    document.body.appendChild(ele);
    ele.innerHTML = html;
}

export default main;






