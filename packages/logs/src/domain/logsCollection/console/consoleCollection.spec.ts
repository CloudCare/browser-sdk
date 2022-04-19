import {
  ErrorSource,
  resetExperimentalFeatures,
  updateExperimentalFeatures,
  display,
  noop,
} from '@datadog/browser-core'
import { validateAndBuildLogsConfiguration } from '../../configuration'
import { HandlerType, StatusType } from '../../logger'
import { createSender } from '../../sender'
import { startConsoleCollection } from './consoleCollection'

describe('console collection', () => {
  const initConfiguration = { clientToken: 'xxx', service: 'service' }
  let sendLogSpy: jasmine.Spy
  let consoleLogSpy: jasmine.Spy
  let stopConsolCollection: () => void

  beforeEach(() => {
    stopConsolCollection = noop
    sendLogSpy = jasmine.createSpy('sendLogSpy')
    consoleLogSpy = spyOn(console, 'log').and.callFake(() => true)
    spyOn(console, 'error').and.callFake(() => true)
  })

  afterEach(() => {
    resetExperimentalFeatures()
    stopConsolCollection()
  })

  it('should send console logs when ff forward-logs is enabled', () => {
    updateExperimentalFeatures(['forward-logs'])
    ;({ stop: stopConsolCollection } = startConsoleCollection(
      validateAndBuildLogsConfiguration({ ...initConfiguration, forwardConsoleLogs: ['log'] })!,
      createSender(sendLogSpy)
    ))

    /* eslint-disable-next-line no-console */
    console.log('foo', 'bar')

    expect(sendLogSpy).toHaveBeenCalledWith({
      message: 'foo bar',
      status: StatusType.info,
      origin: ErrorSource.CONSOLE,
    })

    expect(consoleLogSpy).toHaveBeenCalled()
  })

  it('should not send console logs when ff forward-logs is disabled', () => {
    ;({ stop: stopConsolCollection } = startConsoleCollection(
      validateAndBuildLogsConfiguration({ ...initConfiguration, forwardConsoleLogs: ['log'] })!,
      createSender(sendLogSpy)
    ))

    /* eslint-disable-next-line no-console */
    console.log('foo', 'bar')

    expect(sendLogSpy).not.toHaveBeenCalled()
    expect(consoleLogSpy).toHaveBeenCalled()
  })

  it('should send console errors with "console" origin when ff forward-logs is enabled', () => {
    updateExperimentalFeatures(['forward-logs'])
    ;({ stop: stopConsolCollection } = startConsoleCollection(
      validateAndBuildLogsConfiguration({ ...initConfiguration, forwardErrorsToLogs: true })!,
      createSender(sendLogSpy)
    ))

    /* eslint-disable-next-line no-console */
    console.error('foo', 'bar')

    expect(sendLogSpy.calls.mostRecent().args[0].origin).toEqual(ErrorSource.CONSOLE)
  })

  it('should not send console errors with "console" origin when ff forward-logs is disabled', () => {
    ;({ stop: stopConsolCollection } = startConsoleCollection(
      validateAndBuildLogsConfiguration({ ...initConfiguration, forwardErrorsToLogs: true })!,
      createSender(sendLogSpy)
    ))

    /* eslint-disable-next-line no-console */
    console.error('foo', 'bar')

    expect(sendLogSpy.calls.mostRecent().args[0].origin).not.toBeDefined()
  })

  it('console error should have an error object defined', () => {
    ;({ stop: stopConsolCollection } = startConsoleCollection(
      validateAndBuildLogsConfiguration({ ...initConfiguration, forwardErrorsToLogs: true })!,
      createSender(sendLogSpy)
    ))

    /* eslint-disable-next-line no-console */
    console.error('foo', 'bar')

    expect(sendLogSpy.calls.mostRecent().args[0].error).toEqual({
      origin: ErrorSource.CONSOLE,
      stack: undefined,
    })
  })

  it('should not print the log twice when console handler is enabled', () => {
    updateExperimentalFeatures(['forward-logs'])

    const sender = createSender(sendLogSpy)
    const displaySpy = spyOn(display, 'log')
    ;({ stop: stopConsolCollection } = startConsoleCollection(
      validateAndBuildLogsConfiguration({ ...initConfiguration, forwardConsoleLogs: ['log'] })!,
      sender
    ))

    sender.setHandler([HandlerType.console])
    /* eslint-disable-next-line no-console */
    console.log('foo', 'bar')

    expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    expect(displaySpy).not.toHaveBeenCalled()
  })
})