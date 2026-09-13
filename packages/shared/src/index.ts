export interface Kid {
  name: string
  ageYears: number
}

export interface Family {
  kids: Kid[]
  pet: string
}

export interface ActivitySuggestion {
  minutes: number
  place: string
  title: string
  why: string
  needs: string
  steps: string[]
  easier: string
  harder: string
}

export interface StoryOption {
  title: string
  teaser: string
  minutes: number
}

export interface Story extends StoryOption {
  parts: string[][]
}
