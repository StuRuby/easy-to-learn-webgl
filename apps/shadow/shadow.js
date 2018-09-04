/**
 * 实现阴影的基本思想：太阳看不见阴影。
 * 如果在光源处放置一位观察者，其视线方向与光线一致，那么观察者也看不到阴影。他看到的每一处都在光的照射下，而那些背后的，他没有看到的物体则处在阴影中。
 * 这里，我们需要使用光源与物体之间的距离来决定物体是否可见。实际上也就是物体在光源坐标系下的深度z值。
 * 
 * 我们需要使用两对着色器用以实现阴影：
 *  1. 一对着色器用来计算光源到物体的距离
 *  2. 另一对着色器根据 1 中计算出的距离绘制场景
 */

import { Matrix4 } from '../../utils/gl-matrix';

/**
 * SHADER_VSHADER_SOURCE 和 SHADER_FSHADER_SOURCE 负责生成阴影贴图。
 */
const SHADER_VSHADER_SOURCE = `
    attribute vec4 a_Position;
    uniform mat4 u_MvpMatrix;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
    }
`;

/**
 * 将片元的z值写入了纹理贴图中。
 * gl_FragCoord 是webgl的内置变量，表示片元的坐标。 gl_FragCoord.x和 gl_FragCoord.y是片元在屏幕上的坐标。
 * gl_FragCoord.z是深度值。
 * gl_FragCoord.z = (gl_Position.xyz/gl.Position.w)/2.0 + 0.5;
 * 计算结果都被归一化到[0.0,1.0]区间。如果结果为0，表示该片元在近裁剪面，如果是1.0，表示片元在远裁剪面上。
 */
const SHADER_FSHADER_SOURCE = `
    precision mediump float;
    void main(){
        //将值写入到阴影贴图的R分量之中
        gl_FragColor = vec4(gl_FragCoord.z,0.0,0.0,0.0 );
    }
`;


/**
 * 我们需要比较片元在光源坐标系下的z值和阴影贴图中对应的值来决定当前片元是否处于阴影之中。
 */
const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_MvpMatrixFromLight;
    varying vec4 v_PositionFromLight; //等价于上一个着色器中的 gl_Position.
    varying vec4 v_Color;
    void main(){
        gl_Position = u_MvpMatrix *  a_Position;
        v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
        v_Color = a_Color;
    }
`;
/**
 * 根据片元在光源坐标系中的坐标 v_PositionFromLight 计算出可以与阴影贴图相比较的z值。
 */
const FSHADER_SOURCE = `
    precision mediump float;
    uniform sampler2D u_ShadowMap;
    varying vec4 v_PositionFromLight;
    varying vec4 v_Color;
    void main(){
        vec3 shadowCoord = (v_PositionFromLight.xyz/v_PositionFromLight.w)/2.0 + 0.5;
        vec4 rgbaDepth = texture2D(u_ShadowMap,shadowCoord.xy);
        float depth = rgbaDepth.r;
        float visibility = (shadowCoord.z > depth + 0.005) ? 0.7 : 1.0; 
        gl_FragColor = vec4(v_Color.rgb * visibility , v_Color.a);
    }
`;

const OFFSCREEN_WIDTH = 2048;
const OFFSCREEN_HEIGHT = 2048;
const g_modelMatrix = new Matrix4();
const g_mvpMatrix = new Matrix4();
const LIGHT_X = 0;
const LIGHT_Y = 7;
const LIGHT_Z = 2;


const ANGLE_STEP = 40;   // The increments of rotation angle (degrees)

let last = Date.now(); // Last time that this function was called

function main() {
    const canvas = document.getElementById('webgl');
    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');
    if (!gl) {
        console.log('Failed to create the gl context');
        return;
    }

    const shadowProgram = createProgram(gl, SHADER_VSHADER_SOURCE, SHADER_FSHADER_SOURCE);
    shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
    shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');
    if (shadowProgram.a_Position < 0 || !shadowProgram.u_MvpMatrix) {
        console.log('Failed to get the storage location of attribute or uniform variable');
        return;
    }

    const normalProgram = createProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);
    normalProgram.a_Position = gl.getAttribLocation(normalProgram, 'a_Position');
    normalProgram.a_Color = gl.getAttribLocation(normalProgram, 'a_Color');
    normalProgram.u_MvpMatrix = gl.getUniformLocation(normalProgram, 'u_MvpMatrix');
    normalProgram.u_MvpMatrixFromLight = gl.getUniformLocation(normalProgram, 'u_MvpMatrixFromLight');
    normalProgram.u_ShadowMap = gl.getUniformLocation(normalProgram, 'u_ShadowMap');

    if (normalProgram.a_Position < 0 || normalProgram.a_Color < 0 ||
        !normalProgram.u_MvpMatrix || !normalProgram.u_MvpMatrixFromLight || !normalProgram.u_ShadowMap
    ) {
        console.log('Failed to gte the storage of location of attribute or uniform variable');
        return;
    }

    const triangle = initVertexBufferForTriangle(gl);
    const plane = initVertexBuffersForPlane(gl);
    if (!triangle || !plane) {
        console.log('Failed to set the vertex information');
        return;
    }

    const fbo = initFrameBufferObject(gl);
    if (!fbo) {
        console.log('Failed to create the frame buffer object');
        return;
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fbo.texture);

    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);


    const viewProjMatrixFromLight = new Matrix4();
    viewProjMatrixFromLight.setPerspective(70.0, OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT, 1.0, 100.0);
    viewProjMatrixFromLight.lookAt(LIGHT_X, LIGHT_Y, LIGHT_Z, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    const viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(45, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 7.0, 9.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    let currentAngle = 0.0;
    const mvpMatrixFromLight_t = new Matrix4();
    const mvpMatrixFromLight_p = new Matrix4();

    const tick = function () {
        currentAngle = animate(currentAngle);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shadowProgram);

        drawTriangle(gl, shadowProgram, triangle, currentAngle, viewProjMatrixFromLight);
        mvpMatrixFromLight_t.set(g_mvpMatrix);

        drawPlane(gl, shadowProgram, plane, viewProjMatrixFromLight);
        mvpMatrixFromLight_p.set(g_mvpMatrix);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(normalProgram);
        gl.uniform1i(normalProgram.u_ShadowMap, 0);

        gl.uniformMatrix4fv(normalProgram.u_MvpMatrixFromLight, false, mvpMatrixFromLight_t.elements);
        drawTriangle(gl, normalProgram, triangle, currentAngle, viewProjMatrix);
        gl.uniformMatrix4fv(normalProgram.u_MvpMatrixFromLight, false, mvpMatrixFromLight_p.elements);
        drawPlane(gl, normalProgram, plane, viewProjMatrix);
        window.requestAnimationFrame(tick, canvas);
    }

    tick();
}


/**
 * 
 * @param { WebGLRenderingContext} gl 
 * @param {*} vertex_shader 
 * @param {*} fragment_shader 
 */
function createProgram(gl, vertex_shader, fragment_shader) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, vertex_shader);
    gl.shaderSource(fragmentShader, fragment_shader);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.program = program;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.useProgram(program);
    return program;
}

function drawTriangle(gl, program, triangle, angle, viewProjMatrix) {
    // Set rotate angle to model matrix and draw triangle
    g_modelMatrix.setRotate(angle, 0, 1, 0);
    draw(gl, program, triangle, viewProjMatrix);
}

function drawPlane(gl, program, plane, viewProjMatrix) {
    // Set rotate angle to model matrix and draw plane
    g_modelMatrix.setRotate(-45, 0, 1, 1);
    draw(gl, program, plane, viewProjMatrix);
}

function draw(gl, program, o, viewProjMatrix) {
    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
    if (program.a_Color != undefined) // If a_Color is defined to attribute
        initAttributeVariable(gl, program.a_Color, o.colorBuffer);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

    // Calculate the model view project matrix and pass it to u_MvpMatrix
    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, o.numIndices, gl.UNSIGNED_BYTE, 0);
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}
/**
 * 
 * @param {WebGLRenderingContext} gl 
 */
function initVertexBuffersForPlane(gl) {
    // Create a plane
    //  v1------v0
    //  |        | 
    //  |        |
    //  |        |
    //  v2------v3

    const vertices = new Float32Array([
        3.0, -1.7, 2.5, -3.0, -1.7, 2.5, -3.0, -1.7, -2.5, 3.0, -1.7, -2.5
    ]);

    const colors = new Float32Array([
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0
    ]);

    const indices = new Uint8Array([
        0, 1, 2, 0, 2, 3
    ]);

    const temp = new Object();
    temp.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    temp.colorBuffer = initArrayBufferForLaterUse(gl,  colors, 3, gl.FLOAT);
    temp.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    if (!temp.vertexBuffer || !temp.colorBuffer || !temp.indexBuffer) {
        return null;
    }

    temp.numIndices = indices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return temp;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 */
function initVertexBufferForTriangle(gl) {
    // Create a triangle
    //       v2
    //      / | 
    //     /  |
    //    /   |
    //  v0----v1
    const vertices = new Float32Array([
        -0.8, 3.5, 0.0, 0.8, 3.5, 0.0, 0.0, 3.5, 1.8
    ]);

    const colors = new Float32Array([
        1.0, 0.5, 0.0, 1.0, 0.5, 0.0, 1.0, 0.0, 0.0
    ]);

    const indices = new Uint8Array([0, 1, 2]);

    const temp = new Object();
    temp.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    temp.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
    temp.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    if (!temp.vertexBuffer || !temp.colorBuffer || !temp.indexBuffer) {
        return null;
    }

    temp.numIndices = indices.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return temp;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} data 
 * @param {*} num 
 * @param {*} type 
 */
function initArrayBufferForLaterUse(gl, data, num, type) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    buffer.num = num;
    buffer.type = type;
    return buffer;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} data 
 * @param {*} type 
 */
function initElementArrayBufferForLaterUse(gl, data, type) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return null ;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;

    return buffer;
}



/**
 * 
 * @param {WebGLRenderingContext} gl 
 */
function initFrameBufferObject(gl) {
    let frameBuffer = null,
        texture = null,
        depthBuffer = null;

    const error = () => {
        if (frameBuffer) gl.deleteFramebuffer(frameBuffer);
        if (texture) gl.deleteTexture(texture);
        if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
        return null;
    }

    frameBuffer = gl.createFramebuffer();
    if (!frameBuffer) {
        console.log('Failed to create framebuffer');
        return error();
    }

    texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create texture');
        return error();
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    depthBuffer = gl.createRenderbuffer();
    if (!depthBuffer) {
        console.log('Failed to create the depth buffer');
        return error();
    }

    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

    const e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete: ' + e.toString());
        return error();
    }

    frameBuffer.texture = texture;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return frameBuffer;
}







function animate(angle) {
    const now = Date.now();
    const elapsed = now - last;
    last = now;
    const newAngle = angle + (elapsed * ANGLE_STEP) / 1000.0;
    return newAngle % 360;
}


export default main;