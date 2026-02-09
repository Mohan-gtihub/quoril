
export enum TrackerState {
    IDLE = 'IDLE',
    ACTIVE = 'ACTIVE',
    FOCUS = 'FOCUS'
}

class StateMachine {
    private currentState: TrackerState = TrackerState.IDLE

    transition(to: TrackerState) {
        if (this.currentState === to) return
        console.log(`[StateMachine] ${this.currentState} -> ${to}`)
        this.currentState = to
    }

    getState() {
        return this.currentState
    }
}

export const stateMachine = new StateMachine()
