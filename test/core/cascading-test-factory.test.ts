import { mock, MockProxy } from 'jest-mock-extended';
import { TestFactory } from '../../src/api/test-factory';
import { TestRunExecutor } from '../../src/api/test-run-executor';
import { TestServerExecutor } from '../../src/api/test-server-executor';
import { CascadingTestFactory } from '../../src/core/cascading-test-factory';
import { KarmaTestEventListener } from '../../src/frameworks/karma/runner/karma-test-event-listener';
import { TestDiscoveryProcessor } from '../../src/frameworks/karma/runner/test-discovery-processor';
import { Logger } from '../../src/util/logging/logger';

describe('CascadingTestFactory', () => {
  let mockLogger: MockProxy<Logger>;

  beforeEach(() => {
    mockLogger = mock<Logger>();
  });

  describe('with multiple delegate factories', () => {
    let testServerAndRunnerAndServerExecutorFactory: Pick<
      TestFactory,
      'createTestServer' | 'createTestRunner' | 'createTestServerExecutor' | 'dispose'
    >;
    let testServerAndRunnerAndRunExecutorFactory: Pick<
      TestFactory,
      'createTestServer' | 'createTestRunner' | 'createTestRunExecutor' | 'dispose'
    >;
    let testServerAndRunnerFactory: Pick<TestFactory, 'createTestServer' | 'createTestRunner' | 'dispose'>;
    let testServerFactory: Pick<TestFactory, 'createTestServer' | 'dispose'>;
    let testRunnerFactory: Pick<TestFactory, 'createTestRunner' | 'dispose'>;

    beforeEach(() => {
      testServerAndRunnerAndServerExecutorFactory = {
        createTestServer: jest.fn(),
        createTestRunner: jest.fn(),
        createTestServerExecutor: jest.fn(),
        dispose: jest.fn()
      };
      testServerAndRunnerAndRunExecutorFactory = {
        createTestServer: jest.fn(),
        createTestRunner: jest.fn(),
        createTestRunExecutor: jest.fn(),
        dispose: jest.fn()
      };
      testServerAndRunnerFactory = { createTestServer: jest.fn(), createTestRunner: jest.fn(), dispose: jest.fn() };
      testRunnerFactory = { createTestRunner: jest.fn(), dispose: jest.fn() };
      testServerFactory = { createTestServer: jest.fn(), dispose: jest.fn() };
    });

    describe('the createTestServer method', () => {
      it('calls through to the last delegate factory that implements the factory method', () => {
        const delegateFactories = [
          testServerAndRunnerAndServerExecutorFactory,
          testServerFactory,
          testServerAndRunnerFactory,
          testRunnerFactory
        ];
        const cascadingTestFactory = new CascadingTestFactory(delegateFactories, mockLogger);
        const mockServerExecutor = mock<TestServerExecutor>();

        cascadingTestFactory.createTestServer(mockServerExecutor);

        expect(testServerAndRunnerAndServerExecutorFactory.createTestServer).not.toHaveBeenCalled();
        expect(testServerFactory.createTestServer).not.toHaveBeenCalled();

        expect(testServerAndRunnerFactory.createTestServer).toHaveBeenCalledTimes(1);
        expect(testServerAndRunnerFactory.createTestServer).toHaveBeenCalledWith(mockServerExecutor);
      });

      it('obtains the test server executor from the corresponding factory method when no test server executor is supplied', () => {
        const delegateFactories = [
          testServerAndRunnerFactory,
          testServerAndRunnerAndServerExecutorFactory,
          testRunnerFactory,
          testServerFactory
        ];
        const cascadingTestFactory = new CascadingTestFactory(delegateFactories, mockLogger);

        cascadingTestFactory.createTestServer();

        expect(testServerAndRunnerAndServerExecutorFactory.createTestServerExecutor).toHaveBeenCalledTimes(1);
        const expectedTestServerExecutor = (testServerAndRunnerAndServerExecutorFactory.createTestServerExecutor as any)
          .mock.results[0].value;

        expect(testServerFactory.createTestServer).toHaveBeenCalledTimes(1);
        expect(testServerFactory.createTestServer).toHaveBeenCalledWith(expectedTestServerExecutor);
      });

      it('throws an exception if no delegate factory implements the method', () => {
        const delegateFactories = [testRunnerFactory];
        const cascadingTestFactory = new CascadingTestFactory(delegateFactories, mockLogger);

        expect(() => cascadingTestFactory.createTestServer()).toThrow(
          'There are no delegate test factories able to fulfil requested action: Create Test Server'
        );
      });
    });

    describe('the createTestRunner method', () => {
      it('calls through to the last delegate factory that implements the factory method', () => {
        const delegateFactories = [
          testServerAndRunnerAndServerExecutorFactory,
          testServerAndRunnerFactory,
          testRunnerFactory,
          testServerFactory
        ];
        const cascadingTestFactory = new CascadingTestFactory(delegateFactories, mockLogger);

        const mocktestEventListener = mock<KarmaTestEventListener>();
        const mockTestDiscoveryProcessor = mock<TestDiscoveryProcessor>();
        const mockTestRunExecutor = mock<TestRunExecutor>();
        cascadingTestFactory.createTestRunner(mocktestEventListener, mockTestDiscoveryProcessor, mockTestRunExecutor);

        expect(testServerAndRunnerAndServerExecutorFactory.createTestRunner).not.toHaveBeenCalled();
        expect(testServerAndRunnerFactory.createTestRunner).not.toHaveBeenCalled();

        expect(testRunnerFactory.createTestRunner).toHaveBeenCalledTimes(1);

        expect(testRunnerFactory.createTestRunner).toHaveBeenCalledWith(
          mocktestEventListener,
          mockTestDiscoveryProcessor,
          mockTestRunExecutor
        );
      });

      it('obtains the test run executor from the corresponding factory method when no test server executor is supplied', () => {
        const delegateFactories = [
          testServerAndRunnerAndRunExecutorFactory,
          testServerAndRunnerFactory,
          testRunnerFactory,
          testServerFactory
        ];
        const cascadingTestFactory = new CascadingTestFactory(delegateFactories, mockLogger);

        const mocktestEventListener = mock<KarmaTestEventListener>();
        const mockTestDiscoveryProcessor = mock<TestDiscoveryProcessor>();
        cascadingTestFactory.createTestRunner(mocktestEventListener, mockTestDiscoveryProcessor);

        expect(testServerAndRunnerAndRunExecutorFactory.createTestRunExecutor).toHaveBeenCalledTimes(1);
        const expectedTestRunExecutor = (testServerAndRunnerAndRunExecutorFactory.createTestRunExecutor as any).mock
          .results[0].value;

        expect(testRunnerFactory.createTestRunner).toHaveBeenCalledTimes(1);
        expect(testRunnerFactory.createTestRunner).toHaveBeenCalledWith(
          mocktestEventListener,
          mockTestDiscoveryProcessor,
          expectedTestRunExecutor
        );
      });

      it('throws an exception if no delegate factory implements the method', () => {
        const delegateFactories = [testServerFactory];
        const cascadingTestFactory = new CascadingTestFactory(delegateFactories, mockLogger);

        expect(() =>
          cascadingTestFactory.createTestRunner(
            mock<KarmaTestEventListener>(),
            mock<TestDiscoveryProcessor>(),
            mock<TestRunExecutor>()
          )
        ).toThrow('There are no delegate test factories able to fulfil requested action: Create Test Runner');
      });
    });
  });
});
