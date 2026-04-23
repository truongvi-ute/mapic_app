/**
 * WebSocket Reconnection Logic with Exponential Backoff
 */

export class SOSReconnectionManager {
  private reconnectAttempts = 0;
  private readonly MAX_ATTEMPTS = 10;
  private readonly BASE_DELAY = 1000; // 1 second
  private readonly MAX_DELAY = 30000; // 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriptionTopics: string[] = [];

  /**
   * Start reconnection process with automatic retry
   */
  startReconnection(
    connectFn: () => Promise<void>,
    onSuccess?: () => void,
    onFailure?: () => void
  ): void {
    if (this.reconnectTimer) {
      console.warn('[SOSReconnection] Reconnection already in progress');
      return;
    }

    const attemptReconnect = async () => {
      if (this.reconnectAttempts >= this.MAX_ATTEMPTS) {
        console.error('[SOSReconnection] ❌ Max reconnection attempts reached');
        this.reconnectTimer = null;
        onFailure?.();
        return;
      }

      const delay = Math.min(
        this.BASE_DELAY * Math.pow(2, this.reconnectAttempts),
        this.MAX_DELAY
      );

      console.log(
        `[SOSReconnection] Scheduling reconnection in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.MAX_ATTEMPTS})`
      );

      this.reconnectTimer = setTimeout(async () => {
        try {
          await connectFn();
          console.log('[SOSReconnection] ✅ Reconnection successful');
          this.reset();
          this.reconnectTimer = null;
          onSuccess?.();
        } catch (error) {
          this.reconnectAttempts++;
          console.error(
            `[SOSReconnection] Reconnection attempt ${this.reconnectAttempts} failed:`,
            error
          );
          this.reconnectTimer = null;
          attemptReconnect(); // Schedule next attempt
        }
      }, delay);
    };

    attemptReconnect();
  }

  /**
   * Cancel ongoing reconnection attempts
   */
  cancelReconnection(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      console.log('[SOSReconnection] Reconnection cancelled');
    }
  }

  /**
   * Reset the reconnection attempt counter
   */
  reset(): void {
    this.reconnectAttempts = 0;
    this.cancelReconnection();
    console.log('[SOSReconnection] Attempt counter reset');
  }

  /**
   * Register topics that need to be resubscribed after reconnection
   */
  registerTopics(topics: string[]): void {
    this.subscriptionTopics = [...topics];
  }

  /**
   * Add a single topic to the resubscription list
   */
  addTopic(topic: string): void {
    if (!this.subscriptionTopics.includes(topic)) {
      this.subscriptionTopics.push(topic);
    }
  }

  /**
   * Remove a topic from the resubscription list
   */
  removeTopic(topic: string): void {
    const index = this.subscriptionTopics.indexOf(topic);
    if (index > -1) {
      this.subscriptionTopics.splice(index, 1);
    }
  }

  getTopics(): string[] {
    return [...this.subscriptionTopics];
  }

  clearTopics(): void {
    this.subscriptionTopics = [];
  }

  getAttemptCount(): number {
    return this.reconnectAttempts;
  }

  isReconnecting(): boolean {
    return this.reconnectTimer !== null;
  }

  getNextDelay(): number {
    return Math.min(
      this.BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      this.MAX_DELAY
    );
  }
}
