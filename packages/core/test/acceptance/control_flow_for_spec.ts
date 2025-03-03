/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import {NgIf} from '@angular/common';
import {ChangeDetectorRef, Component, Directive, inject, OnInit, Pipe, PipeTransform, TemplateRef, ViewContainerRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';

describe('control flow - for', () => {
  it('should create, remove and move views corresponding to items in a collection', () => {
    @Component({
      template: '@for ((item of items); track item; let idx = $index) {{{item}}({{idx}})|}',
    })
    class TestComponent {
      items = [1, 2, 3];
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');

    fixture.componentInstance.items.pop();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|');

    fixture.componentInstance.items.push(3);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');

    fixture.componentInstance.items[0] = 3;
    fixture.componentInstance.items[2] = 1;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('3(0)|2(1)|1(2)|');
  });

  it('should work correctly with trackBy index', () => {
    @Component({
      template: '@for ((item of items); track idx; let idx = $index) {{{item}}({{idx}})|}',
    })
    class TestComponent {
      items = [1, 2, 3];
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');

    fixture.componentInstance.items.pop();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|');

    fixture.componentInstance.items.push(3);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');

    fixture.componentInstance.items[0] = 3;
    fixture.componentInstance.items[2] = 1;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('3(0)|2(1)|1(2)|');
  });

  it('should support empty blocks', () => {
    @Component({
      template: '@for ((item of items); track idx; let idx = $index) {|} @empty {Empty}',
    })
    class TestComponent {
      items: number[]|null|undefined = [1, 2, 3];
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('|||');

    fixture.componentInstance.items = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Empty');

    fixture.componentInstance.items = [0, 1];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('||');

    fixture.componentInstance.items = null;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Empty');

    fixture.componentInstance.items = [0];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('|');

    fixture.componentInstance.items = undefined;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('Empty');
  });

  it('should be able to use pipes injecting ChangeDetectorRef in for loop blocks', () => {
    @Pipe({name: 'test', standalone: true})
    class TestPipe implements PipeTransform {
      changeDetectorRef = inject(ChangeDetectorRef);

      transform(value: any) {
        return value;
      }
    }

    @Component({
      template: '@for (item of items | test; track item;) {{{item}}|}',
      imports: [TestPipe],
      standalone: true
    })
    class TestComponent {
      items = [1, 2, 3];
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toBe('1|2|3|');
  });

  describe('trackBy', () => {
    it('should have access to the host context in the track function', () => {
      let offsetReads = 0;

      @Component({template: '@for ((item of items); track $index + offset) {{{item}}}'})
      class TestComponent {
        items = ['a', 'b', 'c'];

        get offset() {
          offsetReads++;
          return 0;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('abc');
      expect(offsetReads).toBeGreaterThan(0);

      const prevReads = offsetReads;
      // explicitly modify the DOM text node to make sure that the list reconciliation algorithm
      // based on tracking indices overrides it.
      fixture.debugElement.childNodes[1].nativeNode.data = 'x';
      fixture.componentInstance.items.shift();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('bc');
      expect(offsetReads).toBeGreaterThan(prevReads);
    });

    it('should be able to access component properties in the tracking function from a loop at the root of the template',
       () => {
         const calls = new Set();

         @Component({
           template: `@for ((item of items); track trackingFn(item, compProp)) {{{item}}}`,
         })
         class TestComponent {
           items = ['a', 'b'];
           compProp = 'hello';

           trackingFn(item: string, message: string) {
             calls.add(`${item}:${message}`);
             return item;
           }
         }

         const fixture = TestBed.createComponent(TestComponent);
         fixture.detectChanges();
         expect([...calls].sort()).toEqual(['a:hello', 'b:hello']);
       });

    it('should be able to access component properties in the tracking function from a nested template',
       () => {
         const calls = new Set();

         @Component({
           template: `
                    @if (true) {
                      @if (true) {
                        @if (true) {
                          @for ((item of items); track trackingFn(item, compProp)) {{{item}}}
                        }
                      }
                    }
                   `,
         })
         class TestComponent {
           items = ['a', 'b'];
           compProp = 'hello';

           trackingFn(item: string, message: string) {
             calls.add(`${item}:${message}`);
             return item;
           }
         }

         const fixture = TestBed.createComponent(TestComponent);
         fixture.detectChanges();
         expect([...calls].sort()).toEqual(['a:hello', 'b:hello']);
       });
  });

  describe('list diffing and view operations', () => {
    it('should delete views in the middle', () => {
      @Component({
        template: '@for (item of items; track item; let idx = $index) {{{item}}({{idx}})|}',
      })
      class TestComponent {
        items = [1, 2, 3];
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');

      // delete in the middle
      fixture.componentInstance.items.splice(1, 1);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('1(0)|3(1)|');
    });

    it('should insert views in the middle', () => {
      @Component({
        template: '@for (item of items; track item; let idx = $index) {{{item}}({{idx}})|}',
      })
      class TestComponent {
        items = [1, 3];
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('1(0)|3(1)|');


      // add in the middle
      fixture.componentInstance.items.splice(1, 0, 2);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');
    });

    it('should replace different items', () => {
      @Component({
        template: '@for (item of items; track item; let idx = $index) {{{item}}({{idx}})|}',
      })
      class TestComponent {
        items = [1, 2, 3];
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|');


      // an item in the middle stays the same, the rest gets replaced
      fixture.componentInstance.items = [5, 2, 7];
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('5(0)|2(1)|7(2)|');
    });

    it('should move and delete items', () => {
      @Component({
        template: '@for (item of items; track item; let idx = $index) {{{item}}({{idx}})|}',
      })
      class TestComponent {
        items = [1, 2, 3, 4, 5, 6];
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges(false);
      expect(fixture.nativeElement.textContent).toBe('1(0)|2(1)|3(2)|4(3)|5(4)|6(5)|');

      // move 5 and do some other delete other operations
      fixture.componentInstance.items = [5, 3, 7];
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('5(0)|3(1)|7(2)|');
    });
  });

  describe('content projection', () => {
    it('should project an @for with a single root node into the root node slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @for (item of items; track $index) {
          <span foo>{{item}}</span>
        } After</test>
      `
      })
      class App {
        items = [1, 2, 3];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 123');
    });

    it('should project an @for with multiple root nodes into the catch-all slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @for (item of items; track $index) {
          <span foo>one{{item}}</span>
          <div foo>two{{item}}</div>
        } After</test>
      `
      })
      class App {
        items = [1, 2];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before one1two1one2two2 After Slot: ');
    });

    // Right now the template compiler doesn't collect comment nodes.
    // This test is to ensure that we don't regress if it happens in the future.
    it('should project an @for with single root node and comments into the root node slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @for (item of items; track $index) {
          <!-- before -->
          <span foo>{{item}}</span>
          <!-- after -->
        } After</test>
      `
      })
      class App {
        items = [1, 2, 3];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 123');
    });

    it('should project the root node when preserveWhitespaces is enabled and there are no whitespace nodes',
       () => {
         @Component({
           standalone: true,
           selector: 'test',
           template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
         })
         class TestComponent {
         }

         @Component({
           standalone: true,
           imports: [TestComponent],
           preserveWhitespaces: true,
           // Note the whitespace due to the indentation inside @for.
           template:
               '<test>Before @for (item of items; track $index) {<span foo>{{item}}</span>} After</test>'
         })
         class App {
           items = [1, 2, 3];
         }

         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();
         expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 123');
       });

    it('should not project the root node when preserveWhitespaces is enabled and there are whitespace nodes',
       () => {
         @Component({
           standalone: true,
           selector: 'test',
           template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
         })
         class TestComponent {
         }

         @Component({
           standalone: true,
           imports: [TestComponent],
           preserveWhitespaces: true,
           // Note the whitespace due to the indentation inside @for.
           template: `
              <test>Before @for (item of items; track $index) {
                <span foo>{{item}}</span>
              } After</test>
            `
         })
         class App {
           items = [1, 2, 3];
         }

         const fixture = TestBed.createComponent(App);
         fixture.detectChanges();
         expect(fixture.nativeElement.textContent)
             .toMatch(/Main: Before\s+1\s+2\s+3\s+After Slot:/);
       });

    it('should not project the root node across multiple layers of @for', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent],
        template: `
        <test>Before @for (item of items; track $index) {
          @for (item of items; track $index) {
            <span foo>{{item}}</span>
          }
        } After</test>
      `
      })
      class App {
        items = [1, 2];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('Main: Before 1212 After Slot: ');
    });

    it('should project an @for with a single root template node into the root node slot', () => {
      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Component({
        standalone: true,
        imports: [TestComponent, NgIf],
        template: `<test>Before @for (item of items; track $index) {
        <span *ngIf="true" foo>{{item}}</span>
      } After</test>`
      })
      class App {
        items = [1, 2];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 12');

      fixture.componentInstance.items.push(3);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 123');
    });

    it('should invoke a projected attribute directive at the root of an @for once', () => {
      let directiveCount = 0;

      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Directive({
        selector: '[foo]',
        standalone: true,
      })
      class FooDirective {
        constructor() {
          directiveCount++;
        }
      }

      @Component({
        standalone: true,
        imports: [TestComponent, FooDirective],
        template: `<test>Before @for (item of items; track $index) {
        <span foo>{{item}}</span>
      } After</test>
      `
      })
      class App {
        items = [1];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(directiveCount).toBe(1);
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 1');
    });

    it('should invoke a projected template directive at the root of an @for once', () => {
      let directiveCount = 0;

      @Component({
        standalone: true,
        selector: 'test',
        template: 'Main: <ng-content/> Slot: <ng-content select="[foo]"/>',
      })
      class TestComponent {
      }

      @Directive({
        selector: '[templateDir]',
        standalone: true,
      })
      class TemplateDirective implements OnInit {
        constructor(
            private viewContainerRef: ViewContainerRef,
            private templateRef: TemplateRef<any>,
        ) {
          directiveCount++;
        }

        ngOnInit(): void {
          const view = this.viewContainerRef.createEmbeddedView(this.templateRef);
          this.viewContainerRef.insert(view);
        }
      }

      @Component({
        standalone: true,
        imports: [TestComponent, TemplateDirective],
        template: `<test>Before @for (item of items; track $index) {
        <span *templateDir foo>{{item}}</span>
      } After</test>
      `
      })
      class App {
        items = [1];
      }

      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(directiveCount).toBe(1);
      expect(fixture.nativeElement.textContent).toBe('Main: Before  After Slot: 1');
    });
  });
});
