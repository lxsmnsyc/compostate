/**
 * @license
 * MIT License
 *
 * Copyright (c) 2021 Alexis Munsayac
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 *
 * @author Alexis Munsayac <alexis.munsayac@gmail.com>
 * @copyright Alexis Munsayac 2021
 */
export default class LinkedWork {
  private dependents = new Set<LinkedWork>();

  private dependencies = new Set<LinkedWork>();

  private work?: () => void;

  constructor(work?: () => void) {
    this.work = work;
  }

  addDependent(link: LinkedWork): void {
    this.dependents.add(link);
  }

  removeDependent(link: LinkedWork): void {
    this.dependents.delete(link);
  }

  addDependency(link: LinkedWork): void {
    this.dependencies.add(link);
  }

  removeDependency(link: LinkedWork): void {
    this.dependencies.delete(link);
  }

  unlinkDependencies(): void {
    this.dependencies.forEach((dependency) => {
      dependency.removeDependent(this);
    });
  }

  clearDependents(): void {
    this.dependents.clear();
  }

  run(): void {
    this.work?.();

    new Set(this.dependents).forEach((dependent) => {
      dependent.run();
    });
  }
}
