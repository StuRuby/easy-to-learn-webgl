import page from 'page';
import mouseControl from './apps/mouseControl';

page('/', function(){
    mouseControl();
});
page();