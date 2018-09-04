import page from 'page';
import mouseControl from './apps/mouseControl';
import pickedObject from './apps/picked/picked-object';
import pickedFace from './apps/picked/picked-face';
import hud from './apps/hud';
import webpage from './apps/hud/webpage';
import fog from './apps/fog/fog';
import drawRoundPoint from './apps/draw/drawRoundPoint';

import programObjects from './apps/toggleShaders/programObjects';
import frameBufferObject from './apps/frameBuffers/frame_buffer_object';

import shadow from './apps/shadow/shadow';
import shadow_highup  from './apps/shadow/shadow_highup';

page('/', function () {
    shadow_highup();
});
page();
