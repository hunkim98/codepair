import { Root, Point, Shape, Rect } from 'features/docSlices';
import { Color, ToolType } from 'features/boardSlices';
import Board from 'components/Editor/DrawingBoard/Canvas/Board';
import { isInnerBox } from '../utils';
import Worker, { MouseMoveCallback, MouseUpCallback } from './Worker';
import { createRect } from '../rect';

class SelectorWorker extends Worker {
  type = ToolType.Selector;

  update: Function;

  board: Board;

  private selectedShape?: Shape;

  private presenceShape?: Shape;

  private isSelectedShapeDeleted: boolean = false;

  private selectorStartPoint: Point = { x: 0, y: 0 };

  constructor(update: Function, board: Board) {
    super();
    this.update = update;
    this.board = board;
  }

  mousedown(point: Point): void {
    const target = this.findTarget(point);
    if (target) {
      this.selectedShape = target;
      this.selectorStartPoint = point;
      if (target.type === 'rect') {
        const selectedRectShape = this.selectedShape as Rect;
        this.presenceShape = createRect(selectedRectShape.points[0], {
          color: selectedRectShape.color as Color,
        });
        this.presenceShape.box.width = selectedRectShape.box.width;
        this.presenceShape.box.height = selectedRectShape.box.height;
      }
      return;
    }

    this.selectedShape = undefined;
  }

  mousemove(point: Point, callback: MouseMoveCallback) {
    if (this.selectedShape) {
      if (!this.isSelectedShapeDeleted) {
        this.update((root: Root) => {
          this.deleteByID(root, this.selectedShape!.getID());
          this.isSelectedShapeDeleted = true;
          this.board.drawAll(root.shapes);
        });
      }
      if (this.selectedShape.type === 'rect') {
        const rectShape = this.presenceShape as Rect;
        const pointOffset: Point = { x: point.x - this.selectorStartPoint.x, y: point.y - this.selectorStartPoint.y };
        const newPoint: Point = {
          x: this.selectedShape.box.x + pointOffset.x,
          y: this.selectedShape.box.y + pointOffset.y,
        };
        rectShape.box.x = newPoint.x;
        rectShape.box.y = newPoint.y;
        rectShape.points[0].x = newPoint.x;
        rectShape.points[0].y = newPoint.y;
        callback({ rect: { ...rectShape } });
      }
    }
  }

  mouseup(callback: MouseUpCallback) {
    this.flushTask();
    callback({});
  }

  flushTask() {
    if (this.presenceShape) {
      this.update((root: Root) => {
        root.shapes.push(this.presenceShape as Rect);
        this.board.drawAll(root.shapes);
      });
    }
    this.isSelectedShapeDeleted = false;
    this.selectedShape = undefined;
    this.presenceShape = undefined;
  }

  /**
   * Check if there is a selected shape.
   */
  isEmptySelectedShape() {
    return !this.selectedShape;
  }

  /**
   * findTarget find the shape in the document.
   */
  findTarget(point: Point): Shape | undefined {
    let target;
    this.update((root: Root) => {
      for (const shape of root.shapes) {
        if (shape.type === 'rect' && isInnerBox(shape.box, point)) {
          target = shape;
          return;
        }
      }
    });
    return target;
  }
}

export default SelectorWorker;
