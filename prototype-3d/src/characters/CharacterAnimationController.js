export class CharacterAnimationController {
  constructor(model) {
    this.model = model;
  }

  update(runtime) {
    this.model.updateFromRuntime(runtime);
  }
}
