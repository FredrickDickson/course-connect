'use client';
import { CheckIcon, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';
import * as RPNInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const ALL_COUNTRIES = RPNInput.getCountries();

type PhoneInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value'
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, 'onChange'> & {
    onChange?: (value: string) => void;
  };

const PhoneInput = React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
  ({
    className,
    onChange,
    defaultCountry = 'GH',
    international = true,
    countryCallingCodeEditable = false,
    countries,
    ...props
  }, ref) => {
    return (
      <RPNInput.default
        ref={ref}
        className={cn(
          'PhoneInput inline-flex h-12 w-full items-center rounded-2xl border border-input bg-muted/40 pr-3 text-base shadow-sm transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 disabled:opacity-60',
          className
        )}
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        inputComponent={InputComponent}
        countries={countries ?? ALL_COUNTRIES}
        defaultCountry={defaultCountry as RPNInput.Country}
        international={international}
        countryCallingCodeEditable={countryCallingCodeEditable}
        onChange={(value) => onChange?.(value || '')}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';

const InputComponent = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        'h-full w-full flex-1 border-0 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
      ref={ref}
    />
  )
);
InputComponent.displayName = 'InputComponent';

type CountrySelectOption = { label: string; value: RPNInput.Country };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: CountrySelectOption[];
};

const CountrySelect = ({
  disabled,
  value,
  onChange,
  options,
}: CountrySelectProps) => {
  const handleSelect = React.useCallback(
    (country: RPNInput.Country) => {
      onChange(country);
    },
    [onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          className={cn(
            'h-full min-h-[48px] rounded-s-2xl rounded-e-none border-0 border-r border-input/70 bg-transparent px-3 text-sm text-foreground hover:bg-muted focus-visible:ring-0 focus-visible:ring-offset-0',
            disabled && 'bg-muted'
          )}
          disabled={disabled}
        >
          <FlagComponent country={value} countryName={value} />
          <ChevronsUpDown
            className={cn(
              '-mr-2 h-4 w-4 opacity-50',
              disabled ? 'hidden' : 'opacity-100'
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[300px] p-0'>
        <Command>
          <CommandList>
            <ScrollArea className='h-72'>
              <CommandInput placeholder='Search country...' />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {options
                  .filter((x) => x.value)
                  .map((option) => (
                    <CommandItem
                      className='gap-2'
                      key={option.value}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <FlagComponent
                        country={option.value}
                        countryName={option.label}
                      />
                      <span className='flex-1 text-sm'>{option.label}</span>
                      {option.value && (
                        <span className='text-foreground/50 text-sm'>
                          {`+${RPNInput.getCountryCallingCode(option.value)}`}
                        </span>
                      )}
                      <CheckIcon
                        className={cn(
                          'ml-auto h-4 w-4',
                          option.value === value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className='bg-foreground/20 flex h-4 w-6 items-center justify-center overflow-hidden rounded-sm'>
      {Flag && <Flag title={countryName} />}
    </span>
  );
};
FlagComponent.displayName = 'FlagComponent';

export default PhoneInput;
