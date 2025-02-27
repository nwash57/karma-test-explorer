import { getPorts } from 'portfinder';
import { Disposable } from './disposable/disposable';
import { Disposer } from './disposable/disposer';
import { Logger } from './logging/logger';

export class PortAcquisitionManager implements Disposable {
  private assignedPorts: Set<number> = new Set();

  public constructor(private readonly logger: Logger) {}

  public async findAvailablePort(basePort: number, futurePortRelease: Promise<unknown>): Promise<number> {
    const singlePortArray: number[] = await this.findAvailablePorts(basePort, futurePortRelease, 1);
    return singlePortArray[0];
  }

  public async findAvailablePorts(
    basePort: number,
    futurePortRelease: Promise<unknown>,
    portCount: number = 1
  ): Promise<number[]> {
    const foundPorts: number[] = [];
    let nextBasePort = basePort;

    while (foundPorts.length < portCount) {
      const desiredPortCount = portCount - foundPorts.length;

      const ports: number[] = await new Promise((resolve, reject) => {
        getPorts(desiredPortCount, { port: nextBasePort }, (error: Error, availablePorts: number[]) => {
          if (!error) {
            resolve(availablePorts);
            return;
          }
          reject(`Failed to get available ports for base port ${basePort}: ${error}`);
        });
      });

      const unassignedPorts = ports.filter(port => !this.assignedPorts.has(port));
      foundPorts.push(...unassignedPorts);
      nextBasePort = Math.max(...ports) + 1;
    }

    foundPorts.forEach(port => this.assignedPorts.add(port));

    futurePortRelease.then(() => {
      this.logger.debug(() => `Releasing ports: ${foundPorts.join(', ')}`);
      foundPorts.forEach(port => this.assignedPorts.delete(port));
    });

    this.logger.debug(
      () => `Request for ${portCount} port(s) at base port ${basePort} acquired: ${foundPorts.join(', ')}`
    );
    this.logger.trace(() => `Current assigned ports: ${[...this.assignedPorts].join(', ')}`);

    return foundPorts;
  }

  public async dispose() {
    await Disposer.dispose(this.logger);
  }
}
