/**
 * 渲染到纹理
 * 使用webgl渲染三维图形，然后将渲染结果作为纹理贴到另一个三维物体上去。
 * 实际上，把渲染结果作为纹理使用，就是动态的生成图像，而不是向服务器加载外部图像。
 * 在纹理图像被贴上图形之前，我们还可以对其进行一些额外的处理，例如生成动态模糊或景深效果。
 */

import { Matrix4 } from '../../utils/gl-matrix';
import VSHADER_SOURCE from './vshader_source.glsl';
import FSHADER_SOURCE from './fshader_source.glsl';

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

    if (!program.a_Position || !program.a_TexCoord || !program.u_MvpMatrix) {
        console.log('Failed to get the location ');
        return;
    }

    
}