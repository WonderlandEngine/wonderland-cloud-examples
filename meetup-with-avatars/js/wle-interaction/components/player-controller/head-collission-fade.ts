import {Component} from '@wonderlandengine/api';
import {typename} from '../../constants.js';

/**
 * Fade to black when the player's head collides with a wall / object
 */

export class HeadCollissionFade extends Component {
    static TypeName = typename('head-collission-fade');
}
