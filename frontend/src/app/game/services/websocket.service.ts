import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

export interface Player {
  id: string;
  x: number;
  y: number;
}

export interface MazeCell {
  x: number;
  y: number;
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface MazeData {
  width: number;
  height: number;
  cells: MazeCell[][];
}

export interface ServerMessage {
  type: string;
  message?: string;
  players?: Player[];
  maze?: MazeData;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private myId: string = '';

  // Observables for components to subscribe to
  public players$ = new Subject<Player[]>();
  public connected$ = new BehaviorSubject<boolean>(false);
  public myId$ = new BehaviorSubject<string>('');
  public maze$ = new Subject<MazeData>();

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get playerId(): string {
    return this.myId;
  }

  connect(serverUrl: string = 'ws://localhost:8080/ws'): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    this.ws = new WebSocket(serverUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected$.next(true);
    };

    this.ws.onmessage = (event) => {
      const data: ServerMessage = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected$.next(false);
      this.myId = '';
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  joinRoom(roomId: string): void {
    this.send({ type: 'join', roomId });
  }

  sendMove(x: number, y: number): void {
    this.send({ type: 'move', x, y });
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: ServerMessage): void {
    switch (data.type) {
      case 'connected':
        this.myId = data.message || '';
        this.myId$.next(this.myId);
        console.log('My player ID:', this.myId);
        break;

      case 'mazeData':
        console.log('Received maze data');
        if (data.maze) {
          this.maze$.next(data.maze);
        }
        if (data.players) {
          this.players$.next(data.players);
        }
        break;

      case 'playerJoined':
        console.log('Player joined:', data.message);
        if (data.players) {
          this.players$.next(data.players);
        }
        break;

      case 'playerLeft':
        console.log('Player left:', data.message);
        if (data.players) {
          this.players$.next(data.players);
        }
        break;

      case 'gameState':
        if (data.players) {
          this.players$.next(data.players);
        }
        break;
    }
  }
}
