/**
 * 
 */

import { Matrix4 } from '../../utils/gl-matrix';

const SOLID_VERTEX_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_NormalMatrix;
    varying vec4 v_Color;
    void main(){
        vec3 lightDirection = vec3(0.0,0.0,1.0);
        vec4 color = vec4(0.0,1.0,1.0,1.0);
        gl_Position = u_MvpMatrix * a_Position;
        vec3 normal = normalize(vec3(u_NormalMatrix*a_Normal));
        float nDotL = max(dot(normal,lightDirection),0.0);
        v_Color= vec4(color.rgb*nDotL,color.a);
    }
`;

const SOLID_FSHADER_SOURCE = `
    precision mediump float;
    varying vec4 v_Color;
    void main(){
        gl_FragColor= v_Color;
    }
`;

const TEXTURE_VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    attribute vec2 a_TextCoord;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_NormalMatrix;
    varying float v_NDotL;
    varying vec2 v_TexCoord;
    void main(){
        vec3 lightDirection = vec3(0.0,0.0,1.0);
        gl_Position = u_MvpMatrix * a_Position;
        vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));
        v_NDotL=max(dot(normal,lightDirection),0.0);
        v_TexCoord= a_TextCoord;
    }
`;

const TEXTURE_FSHADER_SOURCE = `
    precision mediump float;
    varying float v_NDotL;
    varying vec2 v_TexCoord;
    uniform sampler2D u_Sampler;
    void main(){
        vec4 color = texture2D(u_Sampler,v_TexCoord);
        gl_FragColor = vec4(color.rgb * v_NDotL ,color.a);
    }
`;

function main() {
    const canvas = document.getElementById('webgl');
    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');

    const solid_vertex_shader = gl.createShader(gl.VERTEX_SHADER);
    const solid_fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

    const texture_vertex_shader = gl.createShader(gl.VERTEX_SHADER);
    const texture_fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(solid_vertex_shader, SOLID_VERTEX_SOURCE);
    gl.shaderSource(solid_fragment_shader, SOLID_FSHADER_SOURCE);

    gl.shaderSource(texture_vertex_shader, TEXTURE_VSHADER_SOURCE);
    gl.shaderSource(texture_fragment_shader, TEXTURE_FSHADER_SOURCE);

    gl.compileShader(solid_vertex_shader);
    gl.compileShader(solid_fragment_shader);

    gl.compileShader(texture_vertex_shader);
    gl.compileShader(texture_fragment_shader);

    const solid_program = gl.createProgram();
    const texture_program = gl.createProgram();

    gl.solid_program = solid_program;
    gl.texture_program = texture_program;

    gl.attachShader(solid_program, solid_vertex_shader);
    gl.attachShader(solid_program, solid_fragment_shader);

    gl.attachShader(texture_program, texture_vertex_shader);
    gl.attachShader(texture_program, texture_fragment_shader);

    gl.linkProgram(solid_program);
    gl.linkProgram(texture_program);


    solid_program.a_Position = gl.getAttribLocation(gl.solid_program, 'a_Position');
    solid_program.a_Normal = gl.getAttribLocation(gl.solid_program, 'a_Normal');
    solid_program.u_MvpMatrix = gl.getUniformLocation(gl.solid_program, 'u_MvpMatrix');
    solid_program.u_NormalMatrix = gl.getUniformLocation(gl.solid_program, 'u_NormalMatrix');

    texture_program.a_Position = gl.getAttribLocation(gl.texture_program, 'a_Position');
    texture_program.a_Normal = gl.getAttribLocation(gl.texture_program, 'a_Normal');
    texture_program.a_TextCoord = gl.getAttribLocation(gl.texture_program, 'a_TextCoord');
    texture_program.u_MvpMatrix = gl.getUniformLocation(gl.texture_program, 'u_MvpMatrix');
    texture_program.u_NormalMatrix = gl.getUniformLocation(gl.texture_program, 'u_NormalMatrix');
    texture_program.u_Sampler = gl.getUniformLocation(gl.texture_program, 'u_Sampler');

    if (solid_program.a_Position < 0 || solid_program.a_Normal < 0 || !solid_program.u_MvpMatrix || !solid_program.u_NormalMatrix
        || texture_program.a_Position < 0 || texture_program.a_Normal < 0 || texture_program.a_TextCoord < 0 || !texture_program.u_MvpMatrix || !texture_program.u_NormalMatrix
    ) {
        console.log('Failed to get the storage of attribute or uniform ');
        return;
    }

    const cube = initVertexBuffers(gl);
    if (!cube) {
        console.log('Failed to create the cube');
        return;
    }

    const texture = initTextures(gl, texture_program);
    if (!texture) {
        console.log('Failed to create the texture');
        return;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.clientHeight, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 15.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);

    let currentAngle = 0.0;

    const tick = function () {
        currentAngle = animate(currentAngle);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawSolidCube(gl, solid_program, cube, -2.0, currentAngle, viewProjMatrix);
        drawTextureCube(gl, texture_program, cube, texture, 2.0, currentAngle, viewProjMatrix);

        window.requestAnimationFrame(tick, canvas);
    };
    tick();
}
/**
 * 
 * @param {WebGLRenderingContext} gl 
 */
function initVertexBuffers(gl) {
    const vertices = new Float32Array([
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,    // v0-v1-v2-v3 front
        1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,    // v0-v3-v4-v5 right
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,    // v1-v6-v7-v2 left
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,    // v7-v4-v3-v2 down
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0     // v4-v7-v6-v5 back   
    ]);

    const normals = new Float32Array([
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,     // v0-v1-v2-v3 front
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,     // v0-v3-v4-v5 right
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,     // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,     // v1-v6-v7-v2 left
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,     // v7-v4-v3-v2 down
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0      // v4-v7-v6-v5 back   
    ]);

    const texCoords = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,    // v0-v1-v2-v3 front
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,    // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,    // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,    // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,    // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0     // v4-v7-v6-v5 back
    ]);

    const indices = new Uint8Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // right
        8, 9, 10, 8, 10, 11,    // up
        12, 13, 14, 12, 14, 15,    // left
        16, 17, 18, 16, 18, 19,    // down
        20, 21, 22, 20, 22, 23     // back
    ]);

    const tmp = new Object();

    tmp.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    tmp.normalBuffer = initArrayBufferForLaterUse(gl, normals, 3, gl.FLOAT);
    tmp.texCoordsBuffer = initArrayBufferForLaterUse(gl, texCoords, 2, gl.FLOAT);
    tmp.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    if (!tmp.vertexBuffer || !tmp.normalBuffer || !tmp.texCoordsBuffer || !tmp.indexBuffer) {
        console.log('Failed to create the buffer');
        return null;
    }

    tmp.numIndices = indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return tmp;
}
/**
 * 
 * @param { WebGLRenderingContext } gl 
 * @param {*} data 
 * @param {*} type 
 */
function initArrayBufferForLaterUse(gl, data, num, type) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the webgl buffer');
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;
    buffer.num = num;
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
        console.log('Failed to create the webgl buffer');
        return;
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;
    return buffer;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} program 
 */
function initTextures(gl, program) {
    const texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture');
        return null;
    }

    const image = new Image();
    if (!image) {
        console.log('Failed to create the image');
        return null;
    }

    image.onload = function () {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        gl.useProgram(program);
        gl.uniform1i(program.u_Sampler, 0);

        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    image.src = require('../../assets/girl.jpg');
    return texture;
}

const ANGLE_STEP = 30;
let last = Date.now();

function animate(angle) {
    const now = Date.now();
    const elapsed = now - last;

    last = now;
    const newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
    return newAngle % 360;
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} program 
 * @param {*} o 
 * @param {*} x 
 * @param {*} angle 
 * @param {*} viewProjMatrix 
 */
function drawSolidCube(gl, program, o, x, angle, viewProjMatrix) {
    gl.useProgram(program);

    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, o.normalBuffer);
    // initAttributeVariable(gl, program.a_TextCoord, o.texCoordsBuffer);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, texture);

    drawCube(gl, program, o, x, angle, viewProjMatrix);
}


const g_modelMatrix = new Matrix4();
const g_mvpMatrix = new Matrix4();
const g_normalMatrix = new Matrix4();

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} program 
 * @param {*} o 
 * @param {*} x 
 * @param {*} angle 
 * @param {*} viewProjMatrix 
 */
function drawCube(gl, program, o, x, angle, viewProjMatrix) {
    g_modelMatrix.setTranslate(x, 0.0, 0.0);
    g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

    g_normalMatrix.setInverseOf(g_modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(program.u_NormalMatrix, false, g_normalMatrix.elements);

    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    gl.drawElements(gl.TRIANGLES, o.numIndices, o.indexBuffer.type, 0);
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} program 
 * @param {*} o 
 * @param {*} texture 
 * @param {*} x 
 * @param {*} angle 
 * @param {*} viewProjMatrix 
 */
function drawTextureCube(gl, program, o, texture, x, angle, viewProjMatrix) {
    gl.useProgram(program);

    initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
    initAttributeVariable(gl, program.a_Normal, o.normalBuffer);
    initAttributeVariable(gl, program.a_TextCoord, o.texCoordsBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.indexBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    drawCube(gl, program, o, x, angle, viewProjMatrix);
}

/**
 * 
 * @param {WebGLRenderingContext} gl 
 * @param {*} a_attribute 
 * @param {*} buffer 
 */
function initAttributeVariable(gl, a_attribute, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);
}


export default main;