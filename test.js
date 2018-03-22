'use strict';

const {readdirSync} = require('fs');
const {join} = require('path');

const POLYFILLS = {
  cjs: require('./index'),
  'umd: dev': require('./react-lifecycles-compat'),
  'umd: prod': require('./react-lifecycles-compat.min'),
};

Object.entries(POLYFILLS).forEach(([name, polyfill]) => {
  describe(`react-lifecycles-compat (${name})`, () => {
    readdirSync(join(__dirname, 'react')).forEach(version => {
      const basePath = `./react/${version}/node_modules/`;

      const createReactClass = require(basePath + 'create-react-class');
      const React = require(basePath + 'react');
      const ReactDOM = require(basePath + 'react-dom');

      describe(`react@${version}`, () => {
        it('should initialize and update state correctly', () => {
          class ClassComponent extends React.Component {
            constructor(props) {
              super(props);
              this.state = {count: 1};
            }
            static getDerivedStateFromProps(nextProps, prevState) {
              return {
                count: prevState.count + nextProps.incrementBy,
              };
            }
            render() {
              return React.createElement('div', null, this.state.count);
            }
          }

          polyfill(ClassComponent);

          const container = document.createElement('div');
          ReactDOM.render(
            React.createElement(ClassComponent, {incrementBy: 2}),
            container
          );

          expect(container.textContent).toBe('3');

          ReactDOM.render(
            React.createElement(ClassComponent, {incrementBy: 3}),
            container
          );

          expect(container.textContent).toBe('6');
        });

        it('should support create-react-class components', () => {
          let componentDidUpdateCalled = false;

          const CRCComponent = createReactClass({
            statics: {
              getDerivedStateFromProps(nextProps, prevState) {
                return {
                  count: prevState.count + nextProps.incrementBy,
                };
              },
            },
            getInitialState() {
              return {count: 1};
            },
            getSnapshotBeforeUpdate(prevProps, prevState) {
              return prevState.count * 2 + this.state.count * 3;
            },
            componentDidUpdate(prevProps, prevState, snapshot) {
              expect(prevProps).toEqual({incrementBy: 2});
              expect(prevState).toEqual({count: 3});
              expect(this.props).toEqual({incrementBy: 3});
              expect(this.state).toEqual({count: 6});
              expect(snapshot).toBe(24);
              componentDidUpdateCalled = true;
            },
            render() {
              return React.createElement('div', null, this.state.count);
            },
          });

          polyfill(CRCComponent);

          const container = document.createElement('div');
          ReactDOM.render(
            React.createElement(CRCComponent, {incrementBy: 2}),
            container
          );

          expect(container.textContent).toBe('3');
          expect(componentDidUpdateCalled).toBe(false);

          ReactDOM.render(
            React.createElement(CRCComponent, {incrementBy: 3}),
            container
          );

          expect(container.textContent).toBe('6');
          expect(componentDidUpdateCalled).toBe(true);
        });

        it('should support class components', () => {
          let componentDidUpdateCalled = false;

          class Component extends React.Component {
            constructor(props) {
              super(props);
              this.state = {count: 1};
            }
            static getDerivedStateFromProps(nextProps, prevState) {
              return {
                count: prevState.count + nextProps.incrementBy,
              };
            }
            getSnapshotBeforeUpdate(prevProps, prevState) {
              return prevState.count * 2 + this.state.count * 3;
            }
            componentDidUpdate(prevProps, prevState, snapshot) {
              expect(prevProps).toEqual({incrementBy: 2});
              expect(prevState).toEqual({count: 3});
              expect(this.props).toEqual({incrementBy: 3});
              expect(this.state).toEqual({count: 6});
              expect(snapshot).toBe(24);
              componentDidUpdateCalled = true;
            }
            render() {
              return React.createElement('div', null, this.state.count);
            }
          }

          polyfill(Component);

          const container = document.createElement('div');
          ReactDOM.render(
            React.createElement(Component, {incrementBy: 2}),
            container
          );

          expect(container.textContent).toBe('3');
          expect(componentDidUpdateCalled).toBe(false);

          ReactDOM.render(
            React.createElement(Component, {incrementBy: 3}),
            container
          );

          expect(container.textContent).toBe('6');
          expect(componentDidUpdateCalled).toBe(true);
        });

        it('should throw if componentDidUpdate is not defined on the prototype', () => {
          let componentDidUpdateCalled = false;

          class Component extends React.Component {
            constructor(props) {
              super(props);

              Object.defineProperty(this, 'componentDidUpdate', {
                value: (prevProps, prevState, snapshot) => {},
              });
            }
            getSnapshotBeforeUpdate(prevProps, prevState) {}
            render() {
              return null;
            }
          }

          expect(() => polyfill(Component)).toThrow(
            'Cannot polyfill getSnapshotBeforeUpdate() unless componentDidUpdate() exists on the prototype'
          );
        });

        it('should support getDerivedStateFromProps in subclass', () => {
          class BaseClass extends React.Component {
            constructor(props) {
              super(props);
              this.state = {};
            }
            static getDerivedStateFromProps(nextProps, prevState) {
              return {
                foo: 'foo',
              };
            }
            render() {
              return null;
            }
          }

          polyfill(BaseClass);

          class SubClass extends BaseClass {
            static getDerivedStateFromProps(nextProps, prevState) {
              return {
                ...BaseClass.getDerivedStateFromProps(nextProps, prevState),
                bar: 'bar',
              };
            }
            render() {
              return React.createElement(
                'div',
                null,
                this.state.foo + ',' + this.state.bar
              );
            }
          }

          const container = document.createElement('div');
          ReactDOM.render(React.createElement(SubClass), container);

          expect(container.textContent).toBe('foo,bar');
        });

        it('should error for non-class components', () => {
          function FunctionalComponent() {
            return null;
          }

          expect(() => polyfill(FunctionalComponent)).toThrow(
            'Can only polyfill class components'
          );
        });

        it('should ignore component with cWM or cWRP lifecycles if they do not define static gDSFP', () => {
          class ComponentWithLifecycles extends React.Component {
            componentWillMount() {}
            componentWillReceiveProps() {}
            render() {
              return null;
            }
          }

          polyfill(ComponentWithLifecycles);
        });

        it('should error if component already has cWM or cWRP lifecycles with static gDSFP', () => {
          class ComponentWithWillMount extends React.Component {
            componentWillMount() {}
            static getDerivedStateFromProps() {}
            render() {
              return null;
            }
          }

          class ComponentWithWillReceiveProps extends React.Component {
            componentWillReceiveProps() {}
            static getDerivedStateFromProps() {}
            render() {
              return null;
            }
          }

          expect(() => polyfill(ComponentWithWillMount)).toThrow(
            'Cannot polyfill if componentWillMount already exists'
          );
          expect(() => polyfill(ComponentWithWillReceiveProps)).toThrow(
            'Cannot polyfill if componentWillReceiveProps already exists'
          );
        });

        it('should error if component already has cWU lifecycles with gSBU', () => {
          class ComponentWithWillUpdate extends React.Component {
            componentWillUpdate() {}
            getSnapshotBeforeUpdate() {}
            render() {
              return null;
            }
          }

          expect(() => polyfill(ComponentWithWillUpdate)).toThrow(
            'Cannot polyfill if componentWillUpdate already exists'
          );
        });
      });
    });
  });
});
