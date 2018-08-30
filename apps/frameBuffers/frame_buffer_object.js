/**
 * 渲染到纹理
 * 使用webgl渲染三维图形，然后将渲染结果作为纹理贴到另一个三维物体上去。
 * 实际上，把渲染结果作为纹理使用，就是动态的生成图像，而不是向服务器加载外部图像。
 * 在纹理图像被贴上图形之前，我们还可以对其进行一些额外的处理，例如生成动态模糊或景深效果。
 */

import { Matrix4 } from '../../utils/gl-matrix';

const OFFSCREEN_WIDTH = 256;
const OFFSCREEN_HEIGHT = 256;

const ANGLE_STEP = 30;
let last = Date.now();

const g_modelMatrix = new Matrix4();
const g_mvpMatrix = new Matrix4();


const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    uniform mat4 u_MvpMatrix;
    varying vec2 v_TexCoord;

    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_TexCoord= a_TexCoord;
    }
`;

const FSHADER_SOURCE = `
    precision mediump float;
    //sampler2D 绑定到gl.TEXTURE_2D上的纹理数据类型 
    //samplerCube  绑定到gl.TEXTURE_CUBE_MAP上的纹理数据类型
    uniform sampler2D u_Sampler; 
    varying vec2 v_TexCoord;
    void main(){
        gl_FragColor = texture2D(u_Sampler,v_TexCoord);
    }
`;

function main() {
    const canvas = document.getElementById('webgl');
    /**
     * @type { WebGLRenderingContext }  
     */
    const gl = canvas.getContext('webgl');

    const vertex_shader = gl.createShader(gl.VERTEX_SHADER);
    const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertex_shader, VSHADER_SOURCE);
    gl.shaderSource(fragment_shader, FSHADER_SOURCE);

    gl.compileShader(vertex_shader);
    gl.compileShader(fragment_shader);

    const program = gl.createProgram();
    gl.program = program;
    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);

    gl.linkProgram(program);
    gl.useProgram(program);

    program.a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    program.a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
    program.u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');

    if (program.a_Position < 0 || program.a_TexCoord < 0 || !program.u_MvpMatrix) {
        console.log('Failed to get the location ');
        return;
    }

    // set the vertex information.
    const cube = initVertexBufferForCube(gl);
    const plane = initVertexBufferForPlane(gl);

    if (!cube || !plane) {
        console.log('Failed to set the vertex information');
        return;
    }

    //set the texture
    const texture = initTextures(gl);
    if (!texture) {
        console.log('Failed to create the texture');
        return;
    }

    const fbo = initFramebufferObject(gl);
    if (!fbo) {
        console.log('Failed to init the framebuffer object');
        return;
    }

    gl.enable(gl.DEPTH_TEST);

    const viewProjMatrix = new Matrix4();
    viewProjMatrix.setPerspective(30.0, canvas.width / canvas.height, 1.0, 100.0);
    viewProjMatrix.lookAt(0.0, 0.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);


    const viewProjMatrixFBO = new Matrix4();
    viewProjMatrixFBO.setPerspective(30.0, OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT, 1.0, 100.0);
    viewProjMatrixFBO.lookAt(0.0, 2.0, 7.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0);


    let currentAngle = 0.0;
    const tick = () => {
        currentAngle = animate(currentAngle);
        draw(gl, canvas, fbo, plane, cube, currentAngle, texture, viewProjMatrix, viewProjMatrixFBO);
        window.requestAnimationFrame(tick, canvas);
    };

    tick();
}

/**
 * 
 * @param { WebGLRenderingContext } gl 
 */
function initVertexBufferForCube(gl) {
    const vertices = new Float32Array([
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0,    // v0-v1-v2-v3 front
        1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0,    // v0-v3-v4-v5 right
        1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,    // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0,    // v1-v6-v7-v2 left
        -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,    // v7-v4-v3-v2 down
        1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0     // v4-v7-v6-v5 back
    ]);

    const texCoord = new Float32Array([
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

    const temp = new Object();

    temp.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    temp.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoord, 2, gl.FLOAT);
    temp.indicesBuffer = initElementBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    if (!temp.vertexBuffer || !temp.texCoordBuffer || !temp.indicesBuffer) {
        console.log('Failed to init array buffer and element buffer');
        return;
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
function initVertexBufferForPlane(gl) {
    // create face 
    // v1 ---- v0
    // |        |
    // |        |
    // |        |
    // v2 ---- v3

    const vertices = new Float32Array([
        1.0, 1.0, 0.0, -1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0    // v0-v1-v2-v3        
    ]);

    const texCoord = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0
    ]);

    const indices = new Uint8Array([
        0, 1, 2, 0, 2, 3
    ]);

    const temp = new Object();
    temp.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
    temp.texCoordBuffer = initArrayBufferForLaterUse(gl, texCoord, 2, gl.FLOAT);
    temp.indicesBuffer = initElementBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);

    if (!temp.vertexBuffer || !temp.texCoordBuffer || !temp.indicesBuffer) {
        console.log('Failed to create buffer for plane');
        return;
    }

    temp.numIndices = indices.length;

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return temp;
}


/**
 * 
 * @param { WebGLRenderingContext } gl 
 * @param {*} data 
 * @param {*} num 
 * @param {*} type 
 */
function initArrayBufferForLaterUse(gl, data, num, type) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the array buffer');
        return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.num = num;
    buffer.type = type;
    return buffer;
}


/**
 * 
 * @param { WebGLRenderingContext } gl 
 * @param {*} data 
 * @param {*} type 
 */
function initElementBufferForLaterUse(gl, data, type) {
    const buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the element buffer');
        return null;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

    buffer.type = type;
    return buffer;
}

/**
 * 
 * @param { WebGLRenderingContext } gl 
 */
function initTextures(gl) {
    const texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture');
        return;
    }

    const u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    if (!u_Sampler) {
        console.log('Failed to get the location of u_Sampler');
        return;
    }

    const image = new Image();
    image.onload = function () {
        //对纹理对象进行Y轴反转  webgl纹理坐标系统中的t轴方向和png,bmp,jpg等格式图片坐标系统的y轴方向是反的，
        //因此只有先将图像y轴进行反转，才可以正确的将图像映射到图形上
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        //绑定纹理对象，告诉webgl系统使用的是哪种类型的纹理类型   
        //gl.TEXTURE_2D => 2D纹理  
        //gl.TEXTURE_CUBE_MAP => 3D纹理
        gl.bindTexture(gl.TEXTURE_2D, texture);
        //配置纹理对象的参数
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        //将纹理图像分配给纹理对象。
        //gl.texImage2D(target,level,图像内部格式，纹理数据格式，纹理数据类型，包含纹理图像的image图像)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        //将纹理单元传递给片元着色器
        gl.uniform1i(u_Sampler, 0);

        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    image.src = require('../../assets/sky_cloud.jpg');
    return texture;
}


/**
 *
 * @param {WebGLRenderingContext} gl
 */
function initFramebufferObject(gl) {
    let frameBuffer = null;
    let texture = null;
    let depthBuffer = null;

    const error = () => {
        //删除帧缓冲区对象
        frameBuffer && gl.deleteFramebuffer(frameBuffer);
        //删除纹理对象
        texture && gl.deleteTexture(texture);
        //删除渲染缓冲区
        depthBuffer && gl.deleteRenderbuffer(depthBuffer);
        return null;
    };
    //创建帧缓冲区对象
    frameBuffer = gl.createFramebuffer();
    if (!frameBuffer) {
        console.log('Failed to create the frame buffer object');
        return error();
    }
    //创建纹理对象
    texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture buffer object');
        return error();
    }
    //绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture);
    //设置其尺寸和参数
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    frameBuffer.texture = texture;
    //创建渲染缓冲区
    depthBuffer = gl.createRenderbuffer();
    if (!depthBuffer) {
        console.log('Failed to create renderbuffer object');
        return error();
    }
    //绑定渲染缓冲区并设置其尺寸
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    //作为深度关联对象的渲染缓冲区，其宽度和高度必须与作为颜色关联对象的纹理缓冲区保持一致
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);


    /*将纹理对象和渲染缓冲区关联到帧缓冲区上，并进行离屏绘制。*/

    //绑定帧缓冲区对象
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    //指定纹理对象为帧缓冲区的颜色关联对象
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    //指定渲染缓冲区对象为深度关联对象
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);


    //检查帧缓冲区的配置
    const e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== e) {
        console.log('Frame buffer object is incomplete :' + e.toString());
        return error();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    return frameBuffer;
}



/**
 *
 *
 * @param { WebGLRenderingContext } gl
 * @param {*} canvas
 * @param {*} fbo
 * @param {*} plane
 * @param {*} cube
 * @param {*} angle
 * @param {*} texture
 * @param {*} viewProjMatrix
 * @param {*} viewProjMatrixFBO
 */
function draw(gl, canvas, fbo, plane, cube, angle, texture, viewProjMatrix, viewProjMatrixFBO) {
    //首先将绘制目标切换为帧缓冲区对象`fbo`
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    //定义离线地图的绘图区域
    gl.viewport(0, 0, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

    gl.clearColor(0.2, 0.2, 0.4, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //再其颜色关联对象中绘制立方体
    drawTexturedCube(gl, gl.program, cube, angle, texture, viewProjMatrixFBO);
    //将绘制目标切换为canvas，解除帧缓冲区的绑定
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //将在颜色关联对象(纹理对象)中绘制的图像贴到矩形表面上
    drawTexturedPlane(gl, gl.program, plane, angle, fbo.texture, viewProjMatrix);
}

/**
 *
 *
 * @param { WebGLRenderingContext } gl
 * @param {*} program
 * @param {*} cube
 * @param {*} angle
 * @param {*} texture
 * @param {*} viewProjMatrixFBO
 */
function drawTexturedCube(gl, program, cube, angle, texture, viewProjMatrixFBO) {
    g_modelMatrix.setRotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

    g_mvpMatrix.set(viewProjMatrixFBO);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    drawTexturedObject(gl, program, cube, texture);
}

/**
 *
 *
 * @param { WebGLRenderingContext } gl
 * @param {*} program
 * @param {*} plane
 * @param {*} angle
 * @param {*} texture
 * @param {*} viewProjMatrix
 */
function drawTexturedPlane(gl, program, plane, angle, texture, viewProjMatrix) {
    g_modelMatrix.setTranslate(0, 0, 1);
    g_modelMatrix.rotate(20.0, 1.0, 0.0, 0.0);
    g_modelMatrix.rotate(angle, 0.0, 1.0, 0.0);

    g_mvpMatrix.set(viewProjMatrix);
    g_mvpMatrix.multiply(g_modelMatrix);
    gl.uniformMatrix4fv(program.u_MvpMatrix, false, g_mvpMatrix.elements);

    drawTexturedObject(gl, program, plane, texture);
}


/**
 *
 *
 * @param {WebGLRenderingContext} gl
 * @param {*} program
 * @param {*} obj
 * @param {*} texture
 */
function drawTexturedObject(gl, program, obj, texture) {
    initAttributeVariable(gl, program.a_Position, obj.vertexBuffer);
    initAttributeVariable(gl, program.a_TexCoord, obj.texCoordBuffer);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indicesBuffer);
    // gl.enable(gl.CULL_FACE);
    gl.drawElements(gl.TRIANGLES, obj.numIndices, obj.indicesBuffer.type, 0);
}
/**
 *
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


function animate(angle) {
    const now = Date.now();
    const elapsed = now - last;
    last = now;
    const newAngle = angle + (elapsed * ANGLE_STEP) / 1000.0;
    return newAngle % 360;
}

export default main;