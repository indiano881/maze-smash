import { Component } from '@angular/core';
import { GameComponent } from './game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GameComponent],
  template: `
    <div class="container">
      <h1>Labyrinth Duel</h1>
      <app-game></app-game>
      <div class="controls">
        <p>Use <strong>WASD</strong> to move</p>
        <button (click)="onNewMaze()">New Maze</button>
      </div>
    </div>
  `,
  styles: [`
    .container {
      text-align: center;
    }
    h1 {
      color: #eee;
      margin-bottom: 20px;
      font-size: 2rem;
    }
    .controls {
      margin-top: 20px;
      color: #aaa;
    }
    .controls p {
      margin-bottom: 10px;
    }
    button {
      background: #4a4e69;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 1rem;
      cursor: pointer;
      border-radius: 5px;
      transition: background 0.2s;
    }
    button:hover {
      background: #22223b;
    }
  `]
})
export class AppComponent {
  private gameComponent?: GameComponent;

  onNewMaze() {
    // Will be connected via ViewChild
    window.dispatchEvent(new CustomEvent('newMaze'));
  }
}
