import { APIApplicationCommandInteractionDataOption, APIApplicationCommandOption, APIGuildMember, ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v9'
import { Symbols } from '../..'
import { APIApplicationCommandArgumentOptions, CommandInteraction } from '../../types'
import { Decorators } from '../../utils/Decorators'

type CommandOptionOptions = [
  data: APIApplicationCommandOption & Omit<APIApplicationCommandArgumentOptions, 'type'>,
  customFn?: (inp: string | number | boolean, int: CommandInteraction) => any
]

export const CommandOption = Decorators.createParameterDecorator<CommandOptionOptions>(([data, customFn], cmd, base) => {
  if (!base[Symbols.interaction].options) base[Symbols.interaction].options = []

  if (!cmd.interactionOptions) cmd.interactionOptions = []
  cmd.interactionOptions.push(data)

  return (int) => {
    if (int.data.type !== ApplicationCommandType.ChatInput) return

    let val: APIApplicationCommandInteractionDataOption | undefined
    if (cmd.name !== Symbols.baseCommand) {
      const subCommand = int.data.options?.find(x => x.name === cmd.name)
      if (subCommand?.type === ApplicationCommandOptionType.Subcommand) {
        val = subCommand.options?.find(x => x.name === data.name)
      }
    } else {
      val = int.data.options?.find(x => x.name === data.name)
    }

    if (!val) return undefined

    if (!('value' in val)) return

    return customFn ? customFn(val.value, int) : val.value
  }
})

const CreateOption = (type: ApplicationCommandOptionType, customFn?: (inp: string | number | boolean, int: CommandInteraction) => any) => {
  return (name: string, description: string, options?: Omit<APIApplicationCommandArgumentOptions, 'type' | 'name' | 'description'>) =>
    CommandOption({ type, name, description, ...options } as any, customFn)
}

export const Options = {
  String: CreateOption(ApplicationCommandOptionType.String),
  Integer: CreateOption(ApplicationCommandOptionType.Integer),
  Boolean: CreateOption(ApplicationCommandOptionType.Boolean),
  User: CreateOption(ApplicationCommandOptionType.User, (id, int) => {
    if (typeof id !== 'string') return id

    if (int.data.resolved && 'users' in int.data.resolved && int.data.resolved.users) {
      return int.data.resolved.users[id] ?? { id }
    } else {
      return { id }
    }
  }),
  Member: CreateOption(ApplicationCommandOptionType.User, (id, int) => {
    if (typeof id !== 'string') return id

    if (int.data.resolved && 'members' in int.data.resolved && int.data.resolved.members && int.data.resolved.users) {
      const resolvedMember = int.data.resolved.members[id]
      if (!resolvedMember) return { id }

      const member: APIGuildMember = {
        ...resolvedMember,
        user: int.data.resolved.users[id],
        deaf: Symbol('unknown') as any,
        mute: Symbol('unknown') as any
      }

      return member
    } else {
      return { id }
    }
  }),
  Channel: CreateOption(ApplicationCommandOptionType.Channel),
  Role: CreateOption(ApplicationCommandOptionType.Role),
  Mentionable: CreateOption(ApplicationCommandOptionType.Mentionable),
  Number: CreateOption(ApplicationCommandOptionType.Number)
}
