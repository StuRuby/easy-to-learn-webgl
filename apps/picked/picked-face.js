/**
 * 原理和picked-object类似
 * 在用户点击鼠标时重绘立方体，并将'每个像素属于哪个面'的信息写入到颜色缓冲区的`α`f分量中.
 */
import { Matrix4 } from '../../utils/gl-matrix';

const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;

    attribute float a_Face;  // 表面编号，不可以使用 int

    uniform mat4 u_MvpMatrix;

    uniform int u_PickedFace;  //被选中表面的编号

    varying vec4 v_Color;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;

        int face = int(a_Face);  //转为int类型
        vec3 color = (face==u_PickedFace) ? vec3(1.0) : a_Color.rgb;
        if(u_PickedFace==0){
            v_Color= vec4(color,a_Face/255.0); //将表面编号写入α 分量
        }else{
            v_Color=vec4(color,a_Color.a);
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
    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('获取webgl对象报错');
        return;
    }

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
    const u_PickedFace = gl.getUniformLocation(gl.program, 'u_PickedFace');
    if (!u_MvpMatrix || !u_PickedFace) {
        console.log('Failed to get the location');
        return;
    }

    const viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.clientHeight, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);
    //设置clicked为false
    gl.uniform1i(u_PickedFace, -1);

    let currentAngle = 0.0;

    canvas.onmousedown = function (evt) {
        let x = evt.clientX;
        let y = evt.clientY;
        const rect = canvas.getBoundingClientRect();
        if (rect.left <= x && rect.right > x && rect.top <= y && rect.bottom > y) {
            const xInCanvas = x - rect.left;
            const yInCanvas = rect.bottom - y;
            const face = checkFace(gl, n, xInCanvas, yInCanvas, currentAngle, u_PickedFace, viewProjMatrix, u_MvpMatrix);
            gl.uniform1i(u_PickedFace, face);
            draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);

        }
    }

    const tick = function () {
        currentAngle = animate(currentAngle);
        draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
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
    const colors = new Float32Array([   // Colors
        0.32, 0.18, 0.56, 0.32, 0.18, 0.56, 0.32, 0.18, 0.56, 0.32, 0.18, 0.56, // v0-v1-v2-v3 front
        0.5, 0.41, 0.69, 0.5, 0.41, 0.69, 0.5, 0.41, 0.69, 0.5, 0.41, 0.69,  // v0-v3-v4-v5 right
        0.78, 0.69, 0.84, 0.78, 0.69, 0.84, 0.78, 0.69, 0.84, 0.78, 0.69, 0.84, // v0-v5-v6-v1 up
        0.0, 0.32, 0.61, 0.0, 0.32, 0.61, 0.0, 0.32, 0.61, 0.0, 0.32, 0.61,  // v1-v6-v7-v2 left
        0.27, 0.58, 0.82, 0.27, 0.58, 0.82, 0.27, 0.58, 0.82, 0.27, 0.58, 0.82, // v7-v4-v3-v2 down
        0.73, 0.82, 0.93, 0.73, 0.82, 0.93, 0.73, 0.82, 0.93, 0.73, 0.82, 0.93, // v4-v7-v6-v5 back
    ]);

    const faces = new Uint8Array([
        1, 1, 1, 1,
        2, 2, 2, 2,
        3, 3, 3, 3,
        4, 4, 4, 4,
        5, 5, 5, 5,
        6, 6, 6, 6,
    ]);

    const indices = new Uint8Array([
        0, 1, 2, 0, 2, 3, //front
        4, 5, 6, 4, 6, 7, //right
        8, 9, 10, 8, 10, 11, //up,
        12, 13, 14, 12, 14, 15,//left
        16, 17, 18, 16, 18, 19,//down
        20, 21, 22, 20, 22, 23//back
    ]);

    const indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the index buffer');
        return -1;
    }

    const vertexArrayBufferCreated = createArrayBuffer(gl, vertices, gl.FLOAT, 3, 'a_Position');
    const colorArrayBufferCreated = createArrayBuffer(gl, colors, gl.FLOAT, 3, 'a_Color');
    const faceArrayBufferCreated = createArrayBuffer(gl, faces, gl.UNSIGNED_BYTE, 1, 'a_Face');
    if (!vertexArrayBufferCreated || !colorArrayBufferCreated || !faceArrayBufferCreated) {
        console.log('Failed to create the ' + attribute + ' buffer ');
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

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
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} n 
 * @param {*} xInCanvas 
 * @param {*} yInCanvas 
 * @param {*} currentAngle 
 * @param {*} u_PickedFace 
 * @param {*} viewProjMatrix 
 * @param {*} u_MvpMatrix 
 */
function checkFace(gl, n, xInCanvas, yInCanvas, currentAngle, u_PickedFace, viewProjMatrix, u_MvpMatrix) {
    const pixels = new Uint8Array(4);
    gl.uniform1i(u_PickedFace, 0);
    draw(gl, n, viewProjMatrix, u_MvpMatrix, currentAngle);
    //读取（x,y）处的像素颜色，pixels[3]中存储了表面编号
    gl.readPixels(xInCanvas, yInCanvas, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    return pixels[3];
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

function animate(angle) {
    const now = Date.now();
    const elapsed = now - last;
    last = now;
    const newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}

export default main;