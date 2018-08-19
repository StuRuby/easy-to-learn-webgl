import { mat4, vec3 } from 'gl-matrix';

const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    varying vec2 v_TexCoord;
    void main(){
        gl_Position=u_MvpMatrix*a_Position;
        v_TexCoord=a_TexCoord;
    }
`;

const FSHADER_SOURCE = `
    precision mediump float;
    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;
    void main(){
        gl_FragColor=texture2D(u_Sampler,v_TexCoord);
    }
`;

function main() {

    const canvas = document.getElementById('webgl');
    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('获取webgl对象报错');
        return;
    }
    //创建着色器
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    //指定着色器代码
    gl.shaderSource(vertexShader, VSHADER_SOURCE);
    gl.shaderSource(fragmentShader, FSHADER_SOURCE);
    //编译着色器
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);
    //创建程序对象
    const program = gl.createProgram();
    gl.program = program;
    //为程序对象分配着色器对象
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    //连接程序对象
    gl.linkProgram(program);
    //使用程序对象
    gl.useProgram(program);

    const n = createVertexBuffer(gl);
    if (n < 0) {
        console.log('Failed to create vertex infomation');
        return false;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    const u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    if (!u_MvpMatrix) {
        console.log('Failed to get the uniform location');
        return;
    }
    let viewProjMatrix = mat4.create();
    mat4.perspective(viewProjMatrix, 30.0, canvas.width / canvas.height, 1.0, 100.0);
    let eye = vec3.fromValues(3.0, 3.0, 7.0);
    let center = vec3.fromValues(0.0, 0.0, 0.0);
    let up = vec3.fromValues(0.0, 1.0, 0.0);  //y轴正方向
    mat4.lookAt(viewProjMatrix, eye, center, up);

    let currentAngle = [0.0, 0.0];
    createEventHandlers(canvas, currentAngle);

    if (!createTextures) {
        console.log('Failed tp initial the textures');
        return;
    }

    const tick = function () {
        draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
        requestAnimationFrame(function () {
            draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
        }, canvas);
    };
    tick();

}

let g_mvpMatrix = mat4.create();

/**
 *
 * 绘制
 * @param {WebGLRenderingContext} gl
 * @param {*} n
 * @param {*} viewProjMatrix
 * @param {*} u_MvpMatrix
 * @param {*} currentAngle
 */
function draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle) {
    g_mvpMatrix = mat4.clone(viewProjMatrix);
    mat4.fromRotation(g_mvpMatrix, currentAngle[0], vec3.fromValues(1.0, 0.0, 0.0));
    mat4.fromRotation(g_mvpMatrix, currentAngle[1], vec3.fromValues(0.0, 1.0, 0.0));
    //将`g_mvpMatrix`指定给`u_MvpMatrix`;
    gl.uniformMatrix4fv(u_MvpMatrix, false, g_mvpMatrix);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function createTextures(gl) {
    //创建纹理对象
    const texture = gl.createTextures();
    if (!texture) {
        console.log('Failed to create texture');
        return;
    }
    //获取u_Sampler存储位置
    const u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (!u_Sampler) {
        console.log('Failed to get the u_Sampler location');
        return;
    }
    //创建`image`对象
    const image = new Image();
    if (!image) {
        console.log('Failed to created the image');
        return;
    }
    image.onload = function () {
        loadTexture(gl, texture, u_Sampler, image);
    }
    image.src = require('../../assets/girl.jpg');
    return true;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} texture 
 * @param {*} u_Sampler 
 * @param {*} image 
 */
function loadTexture(gl, texture, u_Sampler, image) {
    //对纹理对象进行反转(webgl纹理系统中的t轴与图片的坐标系统方向是相反的)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    //开启0号纹理单元
    gl.activeTexture(gl.TEXTURE0);
    //绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture);
    //配置纹理参数 
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    //配置纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    //将0号纹理单元传递给着色器中的取样器变量
    gl.uniform1i(u_Sampler, 0);
}


function createEventHandlers(canvas, currentAngle) {
    let dragging = false;
    let lastX = -1,
        lastY = -1;
    canvas.onmousedown = function (evt) {
        const x = evt.clientX;
        const y = evt.clientY;
        const rect = canvas.getBoundingClientRect();
        if (rect.left <= x && rect.right > x && rect.top <= y && rect.bottom > y) {
            lastX = x;
            lastY = y;
            dragging = true;
        }
    };

    canvas.onmouseup = function (evt) {
        dragging = false;
    };

    canvas.onmousemove = function (evt) {
        const x = evt.clientX;
        const y = evt.clientY;
        if (dragging) {
            const factor = 100 / canvas.height;
            const dx = factor * (x - lastX);
            const dy = factor * (y - lastY);

            currentAngle[0] = Math.max(Math.min(currentAngle[0] + dy, 90.0), -90.0);
            currentAngle[1] = currentAngle[1] + dx;
        }
        lastX = x;
        lastY = y;
    };
}

function createVertexBuffer(gl) {
    // create a cube
    //    v6 ------ v5
    //   / |        /|
    //  v1 ------ v0 |
    //  |  |       | |
    //  |v7|-------|-|v4
    //  | /        |/
    //  v2 ------ v3
    // front -> right -> up -> left -> down -> back
    const vertices = new Float32Array([
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,  //v0-v1-v2-v3 
        1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,// v0-v3-v4-v5
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,  // v0-v5-v6-v1
        - 1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,//v1-v6-v7-v2
        - 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0, //v7-v4-v3-v2
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0 //v4-v7-v6-v5
    ]);
    //纹理坐标
    const texCoords = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v0-v1-v2-v3 
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,    // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,    // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,    // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,    // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0   // v4-v7-v6-v5
    ]);

    const indices = new Float32Array([
        0, 1, 2, 0, 2, 3,      //front
        4, 5, 6, 4, 6, 7,      // right
        8, 9, 10, 8, 10, 11,   // up
        12, 13, 14, 12, 14, 15,// left
        16, 17, 18, 16, 18, 19,// down
        20, 21, 22, 20, 22, 23 // back
    ]);


    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the index buffer');
        return -1;
    }

    const verticesBufferCreated = createArrayBuffer(gl, vertices, 3, gl.FLOAT, 'a_Position');
    const texCoordsBufferCreated = createArrayBuffer(gl, texCoords, 2, gl.FLOAT, 'a_TexCoord');
    if (!verticesBufferCreated || !texCoordsBufferCreated) {
        return -1;
    }
    //TODO:
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    //将顶点数据写入缓冲区对象。
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    //webgl首先从绑定到gl.ELEMENT_ARRAY_BUFFER的缓冲区中获取顶点的索引值，然后根据该索引值，从绑定到gl.ARRAY_BUFFER的缓冲区中获取坐标颜色等信息
    //然后传递给attribute变量，并执行顶点着色器。
    return indices.length;
}
/**
 * 创建缓冲区对象 (gl.createBuffer())
 * 绑定缓冲区对象  gl.bindBuffer();
 * 将数据写入缓冲区对象  gl.bufferData();
 * 将缓冲区对象分配给一个attribute变量
 * 开启attribute变量
 * @param {WebGLRenderingContext} gl 
 * @param {*} data 
 * @param {*} num 
 * @param {*} type 
 * @param {*} attribute 
 */
function createArrayBuffer(gl, data, num, type, attribute) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create buffer');
        return -1;
    }
    //绑定缓冲区对象
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    //写入数据
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    //获取`attribute`变量的地址
    const a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the attribute location:' + a_attribute);
        return false;
    }
    //将整个缓冲区对象的引用或指针分配给`a_attribute`变量
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    //开启变量
    gl.enableVertexAttribArray(a_attribute);
    return true;
}

export default main;