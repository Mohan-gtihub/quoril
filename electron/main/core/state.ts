
export enum TrackerState {
    IDLE = 'IDLE',
    ACTIVE = 'ACTIVE',
    FOCUS = 'FOCUS'
}

class StateMachine {
    private currentState: TrackerState = TrackerState.IDLE

    transition(to: TrackerState) {
        if (this.currentState === to) return
        // The transition log is the trace a "my time was not tracked" report is
        // read against — without it there is no record of what the tracker
        // thought it was doing.
        console.log(`[StateMachine] ${this.currentState} -> ${to}`)
        this.currentState = to
    }

    getState() {
        return this.currentState
    }
}

export const stateMachine = new StateMachine()
